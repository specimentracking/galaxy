define([
    "mvc/specimen/specimen-model",
    "mvc/specimen/specimen-filter-view",
    "mvc/specimen/specimen-list-view",
    "mvc/ui/ui-modal", 
    "galaxy.masthead", 
    "utils/utils",
    "libs/toastr"
], function(
    mod_specimen_model,
    mod_filter_view,
    mod_list_view,
    mod_modal,
    mod_masthead,
    mod_utils,
    mod_toastr
){

var SpecimenRouter = Backbone.Router.extend({
    routes: {
        ""                       :    "list",
        "specimens/:specimen_id" :    "detail"
    }
});

var GalaxySpecimens = Backbone.View.extend({

  initialize: function(){
    Galaxy.specimens = this;
    this.specimenRouter = new SpecimenRouter();

    this.specimenRouter.on( 'route:list', function() {
        Galaxy.specimens.filterView = new mod_filter_view.FilterView();
        Galaxy.specimens.filterView.render();
        Galaxy.specimens.galaxySpecimenView = new mod_list_view.GalaxySpecimenView();
    });

    this.specimenRouter.on( 'route:detail', function( specimen_id ) {
        Galaxy.specimens.galaxySpecimenView.renderModalForSpecimen( specimen_id );
    });

    Backbone.history.start();
  },

});

return {
    GalaxyApp: GalaxySpecimens
};

});
