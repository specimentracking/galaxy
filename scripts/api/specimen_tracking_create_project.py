#!/usr/bin/env python
"""
Here is a working example of how to use this script to create a specimen tracking project.
./specimen_tracking_create_project.py --api <api key> --local <galaxy base url> --name my_prject --role <encoded role id>
"""

import os
import sys
import argparse
sys.path.insert( 0, os.path.dirname( __file__ ) )
from common import submit

def main( options ):
    """Collect data and create a new specimen tracking project via the Galaxy API."""
    data = {}
    data[ 'name' ] = options.name
    data[ 'encoded_role_id' ] = options.role
    submit( options.api, '%s%s' % ( options.local_url.rstrip( '/' ), '/api/projects' ), data )

if __name__ == '__main__':
    parser = argparse.ArgumentParser( description='Creation of a specimen tracking project.' )
    parser.add_argument( "-a", "--api", dest="api", required=True, help="API Key" )
    parser.add_argument( "-l", "--local", dest="local_url", required=True, help="URL of the galaxy instance." )
    parser.add_argument( "-n", "--name", required=True, help="Project name." )
    parser.add_argument( "-r", "--role", dest="role", help="Encoded role id." )
    options = parser.parse_args()
    main( options )
