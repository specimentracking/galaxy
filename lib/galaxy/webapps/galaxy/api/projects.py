"""
API operations on a projects.
"""
from galaxy import util
from galaxy import exceptions
from galaxy.web import _future_expose_api as expose_api
from galaxy.web import _future_expose_api_anonymous as expose_api_anonymous
from galaxy.web.base.controller import BaseAPIController
from sqlalchemy.orm.exc import MultipleResultsFound
from sqlalchemy.orm.exc import NoResultFound

import logging
log = logging.getLogger( __name__ )


class ProjectsController( BaseAPIController ):

    def __init__( self, app ):
        super( ProjectsController, self ).__init__( app )

    @expose_api_anonymous
    def index( self, trans, **kwd ):
        """
        index( self, trans, **kwd )
        * GET /api/projects:
            Returns a list of summary data for all projects.

        :returns:   list of dictionaries containing project information
        :rtype:     list

        """
        query = trans.sa_session.query( trans.app.model.Project )
        projects = []
        for project in query:
            project_dict = project.to_dict()
            project_dict[ 'role_id' ] = trans.security.encode_id( project_dict[ 'role_id' ] )
            project_dict[ 'id' ] = trans.security.encode_id( project_dict[ 'id' ] )
            projects.append( project_dict )
        return projects

    def __decode_id( self, trans, encoded_id, object_name=None ):
        """
        Try to decode the id.

        :param  object_name:      Name of the object the id belongs to. (optional)
        :type   object_name:      str
        """
        try:
            return trans.security.decode_id( encoded_id )
        except TypeError:
            raise exceptions.MalformedId( 'Malformed %s id specified, unable to decode.' % object_name if object_name is not None else '' )

    @expose_api_anonymous
    def show( self, trans, id, **kwd ):
        """
        show( self, trans, id, **kwd )
        * GET /api/projects/{encoded_id}:
            returns detailed information about a project

        :param  id:      the encoded id of the project
        :type   id:      an encoded id string

        :returns:   detailed project information
        :rtype:     dictionary

        :raises: MalformedId, ObjectNotFound
        """
        decoded_project_id = self.__decode_id( trans, id, 'project' )
        try:
            project = trans.sa_session.query( trans.app.model.Project ).filter( trans.app.model.Project.table.c.id == decoded_project_id ).one()
        except MultipleResultsFound:
            raise exceptions.InconsistentDatabase( 'Multiple projects found with the same id.' )
        except NoResultFound:
            raise exceptions.RequestParameterInvalidException( 'No project found with the id provided.' )
        except Exception, e:
            raise exceptions.InternalServerError( 'Error loading from the database.' + str( e ) )
        project_dict = project.to_dict()
        project_dict[ 'role_id' ] = trans.security.encode_id( project_dict[ 'role_id' ] )
        project_dict[ 'id' ] = trans.security.encode_id( project_dict[ 'id' ] )
        return project_dict

    @expose_api
    def create( self, trans, payload, **kwd ):
        """
        create( self, trans, payload, **kwd )
        * POST /api/projects:
            Creates a new project. Only ``name`` parameter is required.

        .. note:: Currently, only admin users can create projects.

        :param  payload: dictionary structure containing::
            'name':             the new project's name (required)
            'encoded_role_id':  the encoded id of the connected role (required)
        :type   payload: dict

        :returns:   detailed project information
        :rtype:     dict

        :raises: ItemAccessibilityException, RequestParameterMissingException
        """
        name = payload[ 'name' ]
        encoded_role_id = payload[ 'encoded_role_id' ]
        if not name:
            raise exceptions.RequestParameterMissingException( "Missing required parameter 'name'." )
        if not encoded_role_id:
            raise exceptions.RequestParameterMissingException( "Missing required parameter 'encoded_role_id'." )
        if not trans.user_is_admin:
            raise exceptions.ItemAccessibilityException( 'Only administrators can create projects.' )
        else:
            decoded_role_id = self.__decode_id( trans, encoded_role_id, 'role' )
            project = trans.app.model.Project( name=name, role_id=decoded_role_id )
            trans.sa_session.add( project )
            trans.sa_session.flush()
        project_dict = project.to_dict()
        project_dict[ 'role_id' ] = trans.security.encode_id( project_dict[ 'role_id' ] )
        project_dict[ 'id' ] = trans.security.encode_id( project_dict[ 'id' ] )
        return project_dict
