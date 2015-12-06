"""
API operations for specimen within the Galaxy sample tracking system. Note that specimen within Galaxy are called samples.
"""
from sqlalchemy import and_
from sqlalchemy.orm.exc import MultipleResultsFound
from sqlalchemy.orm.exc import NoResultFound
from galaxy import exceptions
from galaxy.web import _future_expose_api as expose_api
from galaxy.web.base.controller import BaseAPIController
from galaxy.util import string_as_bool_or_none

import logging
log = logging.getLogger( __name__ )


class SpecimensAPIController( BaseAPIController ):
    """
    API documentation at:
    http://docs.galaxysampletracking.apiary.io/
    """

    # Allowed parameter values
    allowed_sample_states = [ 'new', 'onroad', 'psu', 'depleted', 'lost', 'discarded' ]
    allowed_sample_types_part_1 = [ 'blood', 'buccal', 'hair', 'breastmilk', 'stool', 'vaginal_swab', 'placenta', 'cord_blood', 'tissue', 'rectal_swab', 'skin_swab' ]
    allowed_sample_types_part_2 = [ 'dna', 'rna' ]
    allowed_sample_types_part_3 = [ 'amplicon', 'library', 'haplotype', 'enriched_mtdna' ]
    allowed_flags = [ 'genotype_flag', 'haplotype_flag', 'sanger_seq_flag', 'nqs_seg_flag', 'dd_pcr_flag' ]
    # location allowed values: fridge: `0-99`, shelf: `0-99`, rack: `0-99`, box: `0-99`, spot: `A-I` --- `1-9`; ALL COMBINATIONS ARE ALLOWED

    @expose_api
    def index( self, trans, project_id, **kwd ):
        """
        index( self, trans, **kwd ):
        * GET /api/projects/{project_id}/specimens
            Displays a collection (list) of all specimens under the project specified.
        """
        decoded_project_id = self._decode_id( trans, project_id )

        allowed = self._check_role_in_project( trans, decoded_project_id )
        if not allowed:
            raise exceptions.ItemAccessibilityException( 'You do not have the proper role to access the specimens in this project.' )

        try:
            specimens = ( trans.sa_session.query( trans.app.model.Sample )
                          .filter( trans.app.model.Sample.table.c.project_id == decoded_project_id )
                          .all() )
        except Exception:
            raise exceptions.InternalServerError( 'An error occured during the query for specimens' )

        specimens_result = []
        for specimen in specimens:
            verified_specimen = self._verify_specimen( trans, specimen )
            specimens_result.append( self._to_dict( trans, verified_specimen ) )

        sorted_results = sorted( specimens_result, key=lambda x: x[ 'sample_data' ].get( 'family', None ), reverse=False )
        return sorted_results

    @expose_api
    def create( self, trans, barcode, project_id, **kwd ):
        """
        create( self, trans, **kwd ):
        * POST /api/specimens
            Create a new specimen in the system.
        """
        log.debug('*********************************************')
        log.debug('CREATING SPECIMEN')

        data_state = None
        data_location = None
        data_type = None
        data_family = None
        data_relationship = None
        data_note = None
        data_sex = None
        decoded_parent_id = None
        sample_data_input = None
        encoded_parent_id = None

        decoded_project_id = self._decode_id( trans, project_id )

        allowed = self._check_role_in_project( trans, decoded_project_id )
        if not allowed:
            raise exceptions.ItemAccessibilityException( 'You do not have the proper role to create a specimen in this project' )

        conflict = self._is_conflict( trans, barcode, decoded_project_id )
        if conflict:
            raise exceptions.Conflict( 'Specimen with the same barcode and project_id already exists. ')

        log.debug(str(kwd))

        encoded_parent_id = kwd.get( 'parent_id', None )
        if isinstance( encoded_parent_id, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: parent_id' )
        data_state = kwd.get( 'state', None )
        if isinstance( data_state, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: state' )
        data_location = kwd.get( 'location', None )
        if isinstance( data_location, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: location' )
        data_type = kwd.get( 'type', None )
        if isinstance( data_type, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: type' )
        data_family = kwd.get( 'family', None )
        if isinstance( data_family, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: family' )
        data_relationship = kwd.get( 'participant_relationship', None )
        if isinstance( data_relationship, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: participant_relationship' )
        data_note = kwd.get( 'note', None )
        if isinstance( data_note, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: note' )
        data_sex = kwd.get( 'sex', None )
        if isinstance( data_sex, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: sex' )
        if kwd.get('payload', None):
            sample_data_input = kwd.get('payload').get( 'sample_data', None )
        if isinstance( sample_data_input, list ):
            raise exceptions.RequestParameterInvalidException( 'Multiple parameters with the same name found: sample_data' )

        if sample_data_input is not None and encoded_parent_id is None:
            encoded_parent_id = sample_data_input.get( 'parent_id', None )

        if encoded_parent_id:
            decoded_parent_id = self._decode_id( trans, encoded_parent_id )
            try:
                parent_sample = ( trans.sa_session.query( trans.app.model.Sample )
                                       .filter( and_( trans.app.model.Sample.table.c.id == decoded_parent_id, trans.app.model.Sample.table.c.project_id == decoded_project_id ) )
                                       .one() )
            except MultipleResultsFound:
                raise exceptions.InconsistentDatabase( 'Multiple parents found with the same id.' )
            except NoResultFound:
                raise exceptions.RequestParameterInvalidException( 'No specimen found to set as parent with the id provided.' )
            except Exception, e:
                raise exceptions.InternalServerError( 'Error loading from the database: ' + str( e ) )
            #  We have the parent sample, inherit properties from it if possible
            if parent_sample.sample_data:
                parent_family = parent_sample.sample_data.get( 'family', None )
                if parent_family:
                    data_family = parent_family
                parent_relationship = parent_sample.sample_data.get( 'participant_relationship', None )
                if parent_relationship:
                    data_relationship = parent_relationship
                parent_sex = parent_sample.sample_data.get( 'sex', None )
                if parent_sex:
                    data_sex = parent_sex

        sample_data = {}
        if sample_data_input is None:
            # The sample_data object is not part of the request
            # Try loading the individual params
            starting_state = 'new'
            if data_state:
                if self._is_valid_state( data_state ):
                    starting_state = data_state
                else:
                    raise exceptions.ObjectAttributeInvalidException( 'This state is not allowed.' )
            sample_data.update( { 'state': starting_state } )
            if data_location:
                sample_data.update( { 'location': data_location } )
            if data_type:
                sample_data.update( { 'type': data_type } )
            if data_family:
                sample_data.update( { 'family': data_family } )
            if data_relationship:
                sample_data.update( { 'participant_relationship': data_relationship } )
            if data_note:
                sample_data.update( { 'note': data_note } )
            if data_sex:
                sample_data.update( { 'sex': data_sex } )
            if decoded_parent_id:
                sample_data.update( { 'parent_id': decoded_parent_id } )
        else:
            # We got the sample_data object as param.
            sample_data = sample_data_input
            if decoded_parent_id:
                # Specimen has a parent. Add its decoded id.
                sample_data.update( { 'parent_id': decoded_parent_id } )

        name = project_id + '_' + barcode
        new_sample = trans.app.model.Sample( bar_code=barcode,
                                             name=name,
                                             project_id=decoded_project_id,
                                             sample_data=sample_data )
        trans.sa_session.add( new_sample )
        trans.sa_session.flush()

        rval = self._to_dict( trans, new_sample )
        log.debug( "returning: " + str( rval ) )
        return rval

    def _is_conflict( self, trans, barcode, decoded_project_id ):
        conflict = True
        try:
            sample = ( trans.sa_session.query( trans.app.model.Sample )
                                       .filter( and_( trans.app.model.Sample.table.c.bar_code == barcode, trans.app.model.Sample.table.c.project_id == decoded_project_id ) )
                                       .one() )
        except MultipleResultsFound:
            raise exceptions.InconsistentDatabase( 'Multiple specimens with same barcode + project_id properties found.' )
        except NoResultFound:
            conflict = False
        except Exception, e:
            raise exceptions.InternalServerError( 'Error loading from the database: ' + str( e ) )
        return conflict

    @expose_api
    def show( self, trans, **kwd ):
        """
        show( self, trans, **kwd )
        * GET /api/specimens/{sample_id} or [ {barcode} + {project_id} ]
            Show the sample based on its id or the project+barcode combination.
        """
        log.debug('*********************************************')
        log.debug('SHOWING SPECIMEN')

        encoded_sample_id = kwd.get( 'sample_id', None )
        encoded_project_id = kwd.get( 'project_id', None )
        barcode = kwd.get( 'barcode', None )

        if encoded_sample_id is None and ( encoded_project_id is None or barcode is None ):
            raise exceptions.RequestParameterMissingException( 'You have to specify either "sample_id" or combination of "project_id" and "barcode".' )
        elif encoded_sample_id is not None:  # we have the exact sample id
            decoded_sample_id = self._decode_id( trans, encoded_sample_id )
            try:
                sample = ( trans.sa_session.query( trans.app.model.Sample )
                                .filter( trans.app.model.Sample.table.c.id == decoded_sample_id )
                                .one() )
            except MultipleResultsFound:
                raise exceptions.InconsistentDatabase( 'Multiple samples with same id found.' )
            except NoResultFound:
                raise exceptions.ObjectNotFound( 'Sample with the id provided ( %s ) was not found.' % encoded_sample_id )
            except Exception:
                raise exceptions.InternalServerError( 'Error loading from the database.' )
            project_id = sample.project_id
            allowed = self._check_role_in_project( trans, project_id )
            if not allowed:
                raise exceptions.ItemAccessibilityException( 'You do not have the proper role to access this sample.' )
        else:  # we have the barcode and project_id
            decoded_project_id = self._decode_id( trans, encoded_project_id )
            allowed = self._check_role_in_project( trans, decoded_project_id )
            if not allowed:
                raise exceptions.ItemAccessibilityException( 'You do not have the proper role to access this sample' )
            else:
                try:
                    sample = ( trans.sa_session.query( trans.app.model.Sample )
                                    .filter( and_( trans.app.model.Sample.table.c.bar_code == barcode, trans.app.model.Sample.table.c.project_id == decoded_project_id ) )
                                    .one() )
                except MultipleResultsFound:
                    raise exceptions.Conflict( 'Multiple samples with same (barcode + project_id) found.' )
                except NoResultFound:
                    raise exceptions.ObjectNotFound( 'Sample with the provided barcode+project_id was not found' )
                except Exception:
                    raise exceptions.InternalServerError( 'Error loading from the database.' )
        rval = self._to_dict( trans, sample )
        log.debug( 'returning: ' + str( rval ) )
        return rval

    @expose_api
    def update( self, trans, sample_id, **kwd ):
        """
        update( self, trans, sample_id, **kwd )
        * PATCH /api/specimens/:id
            Updates the state of the specified sample.

        :param  state:  number representing the new state of the sample
        :type   state:  integer

        """
        log.debug('*********************************************')
        log.debug('UPDATING SPECIMEN')
        log.debug('kwd: ' + str(kwd))

        #  Load the sample to be updated.
        decoded_sample_id = self._decode_id( trans, sample_id )
        sample = self._load_sample( trans, decoded_sample_id )
        allowed = self._check_role_in_project( trans, sample.project_id )
        if not allowed:
            raise exceptions.ItemAccessibilityException( 'You do not have the proper role to access this sample.' )

        #  Look for url params.
        data_state = kwd.get( 'state', None )
        data_location = kwd.get( 'location', None )
        data_type = kwd.get( 'type', None )
        payload = kwd.get( 'payload', None )

        if ( not ( data_state or data_location or data_type or payload ) ):
            raise exceptions.RequestParameterMissingException( 'No data to update with.' )

        location = None
        sample_type = None
        state = None
        note = None
        participant_relationship = None
        sex = None
        family = None
        participant_dob = None
        date_sent = None
        date_of_collection = None
        genotype_flag = None
        haplotype_flag = None
        sanger_seq_flag = None
        ngs_seg_flag = None
        dd_pcr_flag = None
        parent_id = None

        if payload:
            sample_data = payload.get( 'sample_data', None )
            if sample_data:
                location = sample_data.get( 'location', None )
                sample_type = sample_data.get( 'type', None )
                state = sample_data.get( 'state', None )
                note = sample_data.get( 'note', None )
                participant_relationship = sample_data.get( 'participant_relationship', None )
                sex = sample_data.get( 'sex', None )
                family = sample_data.get( 'family', None )
                participant_dob = sample_data.get( 'participant_dob', None )
                date_sent = sample_data.get( 'date_sent', None )
                date_of_collection = sample_data.get( 'date_of_collection', None )
                parent_id = sample_data.get( 'parent_id', None )
                genotype_flag = string_as_bool_or_none( sample_data.get( 'genotype_flag', 'none' ) )
                haplotype_flag = string_as_bool_or_none( sample_data.get( 'haplotype_flag', 'none' ) )
                sanger_seq_flag = string_as_bool_or_none( sample_data.get( 'sanger_seq_flag', 'none' ) )
                ngs_seg_flag = string_as_bool_or_none( sample_data.get( 'ngs_seg_flag', 'none' ) )
                dd_pcr_flag = string_as_bool_or_none( sample_data.get( 'dd_pcr_flag', 'none' ) )

        future_state = data_state if data_state else state
        if future_state:
            if self._is_valid_state( future_state ):
                sample.sample_data['state'] = future_state
            else:
                raise exceptions.ObjectAttributeInvalidException( 'This state is not valid' )

        future_location = data_location if data_location else location
        if future_location:
            if self._is_valid_location( future_location ):
                sample.sample_data['location'] = future_location
            else:
                raise exceptions.ObjectAttributeInvalidException( 'This location is not valid' )

        future_type = data_type if data_type else sample_type
        if future_type:
            if self._is_valid_type( future_type ):
                sample.sample_data[ 'type' ] = future_type
            else:
                raise exceptions.ObjectAttributeInvalidException( 'This type is not valid' )

        if parent_id:
            decoded_parent_id = self._decode_id( trans, parent_id )
            try:
                parent_sample = self._load_sample( trans, decoded_parent_id )
            except Exception, e:
                raise exceptions.ObjectNotFound( 'The parent sample cannot be found.' + str(e) )
            sample.sample_data[ 'parent_id' ] = decoded_parent_id
        if note:
            sample.sample_data['note'] = note
        if participant_relationship:
            sample.sample_data['participant_relationship'] = participant_relationship
        if sex:
            sample.sample_data['sex'] = sex
        if family:
            sample.sample_data['family'] = family
        if participant_dob:
            sample.sample_data['participant_dob'] = participant_dob
        if date_sent:
            sample.sample_data['date_sent'] = date_sent
        if date_of_collection:
            sample.sample_data['date_of_collection'] = date_of_collection
        if genotype_flag is not None:
            sample.sample_data['genotype_flag'] = genotype_flag
        if haplotype_flag is not None:
            sample.sample_data['haplotype_flag'] = haplotype_flag
        if sanger_seq_flag is not None:
            sample.sample_data['sanger_seq_flag'] = sanger_seq_flag
        if ngs_seg_flag is not None:
            sample.sample_data['ngs_seg_flag'] = ngs_seg_flag
        if dd_pcr_flag is not None:
            sample.sample_data['dd_pcr_flag'] = dd_pcr_flag

        trans.sa_session.add(sample)
        trans.sa_session.flush()

        rval = self._to_dict( trans, sample )
        log.debug( 'returning: ' + str( rval ) )
        return rval

    @expose_api
    def delete( self, trans, sample_id, **kwd ):
        raise exceptions.NotImplemented( 'Deletion of specimens is not implemented yet.' )

    def _check_role_in_project( self, trans, decoded_project_id ):
        """Check whether the current user has access to the project."""
        allowed = False
        try:
            project = ( trans.sa_session.query( trans.app.model.Project )
                                        .filter( trans.app.model.Project.table.c.id == decoded_project_id )
                                        .one() )
        except MultipleResultsFound:
            raise exceptions.InconsistentDatabase( 'Multiple projects with same id found.' )
        except NoResultFound:
            raise exceptions.ObjectNotFound( 'Project with the id provided was not found' )
        except Exception, e:
            raise exceptions.InternalServerError( 'Error loading from the database: ' + str( e ) )
        allowed = trans.app.security_agent.has_role( trans, project.role_id )
        return allowed

    def _decode_id(self, trans, encoded_id):
        """Decode the given encoded id."""
        try:
            decoded_id = trans.security.decode_id( encoded_id )
        except Exception, e:
            log.error( 'An exception occured while decoding ID: ' + str( e ) )
            raise exceptions.MalformedId( 'Malformed id ( %s ) specified, unable to decode.' % encoded_id )
        return decoded_id

    def _load_sample( self, trans, decoded_sample_id):
        """Load the sample with the given decoded id."""
        sample = None
        try:
            sample = ( trans.sa_session.query( trans.app.model.Sample )
                                       .filter( trans.app.model.Sample.table.c.id == decoded_sample_id )
                                       .one() )
        except MultipleResultsFound:
            raise exceptions.InconsistentDatabase( 'Multiple samples with same id found.' )
        except NoResultFound:
            raise exceptions.ObjectNotFound( 'Sample with the id provided ( %s ) was not found' % trans.security.encode_id( decoded_sample_id ) )
        except Exception, e:
            raise exceptions.InternalServerError( 'Error loading from the database: ' + str( e ) )
        return sample

    def _verify_specimen( self, trans, sample ):
        """Check for integrity errors."""
        verified_sample = sample
        if sample.sample_data is not None:
            if sample.sample_data.get('parent_id') is not None:
                #  when parent_id is saved encoded
                # verified_sample = self._fix_saved_encoded_values( trans, verified_sample )

                #  when properties are not properly inherited
                parent_sample = self._load_sample( trans, sample.sample_data.get('parent_id' ) )
                verified_sample = self._ensure_derivate_integrity( trans, verified_sample, parent_sample )

            # if sample.sample_data.get( 'note' ) is not None:
            #     #  when note contains unwanted strings
            #     verified_sample = self._clean_note( trans, verified_sample )
        return verified_sample

    def _fix_saved_encoded_values( self, trans, sample ):
        """Fix values that are saved in DB encoded."""
        former_id = sample.id
        parent_id = sample.sample_data.get( 'parent_id' )
        if isinstance( parent_id, int ):
            #  all is OK
            return sample
        elif ( len( parent_id ) % 16) == 0:
            #  parent_id is saved encoded
            log.debug("VERIFY SAMPLE PARENT ID: " + str(parent_id))
            if len(parent_id) == 16:
                correct_parent_id = trans.security.decode_id( parent_id )
            if len(parent_id) == 48:
                correct_parent_id = self.decode_double_encoded_id( trans, parent_id )
            log.debug("correct parent id: " + str(correct_parent_id))
            if isinstance( correct_parent_id, int ):
                sample_data_copy = sample.sample_data.copy()
                sample_data_copy[ 'parent_id' ] = correct_parent_id
                sample.sample_data = sample_data_copy
                trans.sa_session.add( sample )
                trans.sa_session.flush()
                log.debug("REPLACED ENCODED ID WITH THE CORRECT ID")
            else:
                log.error( "Unable to correct encoded ID saved in the DB" )
        return self._load_sample(trans, former_id)

    def _ensure_derivate_integrity( self, trans, sample, parent_sample ):
        """
        Make sure the inheritable properties are the same
        in derivate specimen as in the parent specimen.
        """
        former_id = sample.id
        if parent_sample.sample_data:
            if parent_sample.sample_data.get( 'family', None ):
                if parent_sample.sample_data.get( 'family' ) != sample.sample_data.get( 'family' ):
                    log.debug( 'for specimen with an ID of: ' + str(sample.id))
                    log.debug( 'Setting sample family to parent value of: ' + str( parent_sample.sample_data[ 'family' ] ) )
                    sample_data_copy = sample.sample_data.copy()
                    sample_data_copy[ 'family' ] = parent_sample.sample_data[ 'family' ]
                    sample.sample_data = sample_data_copy
                    trans.sa_session.add( sample )
                    trans.sa_session.flush()
            if parent_sample.sample_data.get( 'participant_relationship', None ):
                if parent_sample.sample_data.get( 'participant_relationship' ) != sample.sample_data.get( 'participant_relationship' ):
                    log.debug( 'for specimen with an ID of: ' + str(sample.id))
                    log.debug( 'Setting sample participant_relationship to parent value of: ' + str( parent_sample.sample_data[ 'participant_relationship' ] ) )
                    sample_data_copy = sample.sample_data.copy()
                    sample_data_copy[ 'participant_relationship' ] = parent_sample.sample_data[ 'participant_relationship' ]
                    sample.sample_data = sample_data_copy
                    trans.sa_session.add( sample )
                    trans.sa_session.flush()
            if parent_sample.sample_data.get( 'sex', None ):
                if parent_sample.sample_data.get( 'sex' ) != sample.sample_data.get( 'sex' ):
                    log.debug( 'for specimen with an ID of: ' + str(sample.id))
                    log.debug( 'Setting sample sex to parent value of: ' + str( parent_sample.sample_data[ 'sex' ] ) )
                    sample_data_copy = sample.sample_data.copy()
                    sample_data_copy[ 'sex' ] = parent_sample.sample_data[ 'sex' ]
                    sample.sample_data = sample_data_copy
                    trans.sa_session.add( sample )
                    trans.sa_session.flush()
        return self._load_sample( trans, former_id )

    def _clean_note( self, trans, sample ):
        """Delete unwanted notes."""
        former_id = sample.id
        forbidden_notes = [ "Imported from Sarah's XLS sheet on 4/1/2014.", "Imported from Sarah's XLS sheet on 6/9/2014.", "Imported from Sarah's XLS sheet on 6/17/2014.", "Imported from Sarah's XLS sheet on 3/17/2014." ]
        sample_data_copy = sample.sample_data.copy()
        note = sample.sample_data.get( 'note' )
        if note.find( "Imported from Sarah's XLS sheet on" ) == -1:
            #  all is OK
            return sample
        else:
            #  clean the forbidden notes
            log.debug( 'NOTE BEFORE: ' + str( note ) )
            for forbidden_note in forbidden_notes:
                note = note.replace( forbidden_note, "" )
            log.debug( 'NOTE AFTER: ' + str( note ) )
            sample_data_copy[ 'note' ] = note
            sample.sample_data = sample_data_copy
            trans.sa_session.add( sample )
            trans.sa_session.flush()
            log.debug("CLEANED UP NOTE")
        return self._load_sample( trans, former_id )

    def decode_double_encoded_id(self, trans, double_encoded_id):
        # log.debug('returning: ' + str(trans.security.decode_id(trans.security.id_cipher.decrypt( double_encoded_id.decode( 'hex' ) ).lstrip( "!" ))))
        return trans.security.decode_id(trans.security.id_cipher.decrypt( double_encoded_id.decode( 'hex' ) ).lstrip( "!" ))

    # def _check_id_integrity( self, trans, sample ):
    #     """
    #     Check for integrity errors that were introduced by saving encoded IDs into DB.
    #     # log.debug('_to_dict parent id encoded and decoded afterwards: ' + str(self.decode_double_encoded_id(trans, return_sample[ 'sample_data' ]['parent_id'])))
    #     """
    #     working_sample = sample
    #     sample_data = working_sample.sample_data
    #     parent_id = sample_data.get('parent_id', None)
    #     if parent_id is not None:
    #         log.debug('method: check_id_integrity, BEFORE parent_id value: ' + str(parent_id))
    #         if len(str(parent_id)) > 15:
    #             log.debug('method: check_id_integrity, this parent_id is saved ENCODED')
    #             log.debug('method: check_id_integrity, saving decoded value to the DB.')

    #             # the ID is saved encoded so we have to save it decoded
    #             sample_data['parent_id'] = trans.security.decode_id( parent_id )
    #             working_sample.sample_data = sample_data

    #             log.debug('method: check_id_integrity, BEFORE working_sample.sample_data["parent_id"]:' + str(working_sample.sample_data['parent_id']))

    #             working_sample.sample_data['parent_id'] = trans.security.decode_id( parent_id )

    #             log.debug('method: check_id_integrity, AFTER working_sample.sample_data["parent_id"]:' + str(working_sample.sample_data['parent_id']))

    #             trans.sa_session.add(working_sample)
    #             log.debug('is session dirty:    ' + str(working_sample in trans.sa_session.dirty ))
    #             trans.sa_session.flush()

    #         log.debug(' method: check_id_integrity, AFTER parent_id value: ' + str( working_sample.sample_data.get( 'parent_id' ) ) )
    #     return working_sample

    def _to_dict( self, trans, sample ):
        """Encode all IDs that are provided raw from the DB."""
        return_sample = sample.to_dict()
        new_sample_data = sample.sample_data.copy()
        return_sample['sample_data'] = new_sample_data

        parent_id = return_sample.get( 'sample_data' ).get( 'parent_id', None )
        if parent_id is not None:
            if not isinstance( parent_id, int ):
                log.debug( "ALARM!!!!!! PARENT ID IS ENCODED: " + str( parent_id ) )
            #  There are ancestor(s) so we should include whole specimen lineage.
            # lineage_path = self._build_path( trans, sample )[ ::-1 ]
            # return_sample['lineage_path'] = lineage_path
            return_sample[ 'sample_data' ]['parent_id'] = trans.security.encode_id( parent_id )

        return_sample['id'] = trans.security.encode_id( return_sample['id'] )
        if return_sample.get( 'project_id', None ):
            return_sample[ 'project_id' ] = trans.security.encode_id( return_sample[ 'project_id' ] )
        return_sample['create_time'] = sample.create_time.strftime( "%Y-%m-%d %I:%M %p" )
        return_sample['update_time'] = sample.update_time.strftime( "%Y-%m-%d %I:%M %p" )

        return return_sample

    def _build_path( self, trans, sample ):
        """Search the path upwards recursively and load the whole route of
        names and ids for breadcrumb building purposes.

        :param folder: current sample for navigating up
        :param type:   Galaxy Sample

        :returns:   list consisting of full path to the root sample
        :type:      list
        """
        path_to_root = []
        #  We are almost in root
        if sample.sample_data.get('parent_id', None) is None:
            path_to_root.append( trans.security.encode_id( sample.id ) )
        else:
            #  We add the current sample and traverse up one sample.
            path_to_root.append( trans.security.encode_id( sample.id ) )
            if isinstance( sample.sample_data[ 'parent_id' ], int ):
                # log.debug("PARENT ID IS INTEGER")
                upper_sample = trans.sa_session.query( trans.app.model.Sample ).get( sample.sample_data[ 'parent_id' ] )
            elif ( ( len( sample.sample_data[ 'parent_id' ] ) % 16 ) == 0 ):
                upper_sample = trans.sa_session.query( trans.app.model.Sample ).get( trans.security.decode_id( sample.sample_data[ 'parent_id' ] ) )
                # log.debug(str(trans.security.decode_id( sample.sample_data[ 'parent_id' ] ) ) )
                # log.debug(str(sample.to_dict()) )
                # sample = self._verify_specimen( trans, sample )
                # log.debug("after verification:  " + str( sample.sample_data[ 'parent_id' ] ) )
                # upper_sample = trans.sa_session.query( trans.app.model.Sample ).get( sample.sample_data[ 'parent_id' ] )
            path_to_root.extend( self._build_path( trans, upper_sample ) )
        return path_to_root

    def _is_valid_location( self, location ):
        # TODO implement
        is_valid = True
        return is_valid

    def _is_valid_type( self, type ):
        # TODO implement
        is_valid = True
        return is_valid

    def _is_valid_spot( self, spot ):
        # TODO implement
        is_valid = True
        return is_valid

    def _is_valid_state(self, state):
        return state in SpecimensAPIController.allowed_sample_states
