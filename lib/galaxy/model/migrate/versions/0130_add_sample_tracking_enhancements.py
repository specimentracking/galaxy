"""
Add project table. Add column to sample table with project_id as FK.
"""

from sqlalchemy import *
from sqlalchemy.orm import *
from migrate import *
from migrate.changeset import *
from galaxy.model.custom_types import JSONType
from galaxy.model.custom_types import TrimmedString
import datetime
now = datetime.datetime.utcnow

import logging
log = logging.getLogger( __name__ )
metadata = MetaData()

sample_type_table = Table( "sample_type", metadata,
                           Column( "id", Integer, primary_key=True ),
                           Column( "create_time", DateTime, default=now ),
                           Column( "update_time", DateTime, default=now, onupdate=now ),
                           Column( "name", TrimmedString( 255 ) ),
                           Column( "data_definition", JSONType, nullable=True ) )

project_table = Table( "project", metadata,
                       Column( "id", Integer, primary_key=True ),
                       Column( "create_time", DateTime, default=now ),
                       Column( "update_time", DateTime, default=now, onupdate=now ),
                       Column( "name", TrimmedString( 255 ) ),
                       Column( "role_id", Integer, ForeignKey( "role.id" ) ),
                       Column( "sample_type_id", Integer, ForeignKey( "sample_type.id" ) )  )

sample_project_id_column = Column( "project_id", Integer, ForeignKey( "project.id" ), nullable=True )
sample_sample_data_column = Column( "sample_data", JSONType, nullable=True )


def display_migration_details():
    print ""
    print "This migration script adds Project table and columns to Sample table with project_id as FK and to track other properties."


def upgrade(migrate_engine):
    print __doc__
    metadata.bind = migrate_engine
    metadata.reflect()

    try:
        sample_type_table.create()
    except:
        log.debug("Could not create table 'sample_type_table'.")
    try:
        project_table.create()
    except:
        log.debug("Could not create table 'project'.")

    try:
        sample_table = Table( "sample", metadata, autoload=True )

        sample_project_id_column.create( sample_table )
        sample_sample_data_column.create( sample_table )

        assert sample_project_id_column is sample_table.c.project_id
        assert sample_sample_data_column is sample_table.c.sample_data

    except Exception, e:
        print str(e)
        log.debug("Could not create needed columns in table 'sample'.")


def downgrade(migrate_engine):
    metadata.bind = migrate_engine
    metadata.reflect()

    try:
        pass
    except Exception:
        log.debug( "FAIL" )
