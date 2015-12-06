from galaxy import web
from galaxy.web.base.controller import BaseUIController

import logging
log = logging.getLogger( __name__ )


class Specimens( BaseUIController ):

    @web.expose
    def index( self, trans, **kwd ):
        # define app configuration for generic mako template
        app = {
            'jscript': "galaxy.specimens"
        }
        # fill template
        return trans.fill_template('galaxy.panels.mako', config={'app': app})
