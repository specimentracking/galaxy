define(["mvc/specimen/specimen-model","mvc/specimen/specimen-filter-view","mvc/specimen/specimen-list-view","mvc/ui/ui-modal","galaxy.masthead","utils/utils","libs/toastr"],function(a,b,c){var d=Backbone.Router.extend({routes:{"":"list","specimens/:specimen_id":"detail"}}),e=Backbone.View.extend({initialize:function(){Galaxy.specimens=this,this.specimenRouter=new d,this.specimenRouter.on("route:list",function(){Galaxy.specimens.filterView=new b.FilterView,Galaxy.specimens.filterView.render(),Galaxy.specimens.galaxySpecimenView=new c.GalaxySpecimenView}),this.specimenRouter.on("route:detail",function(a){Galaxy.specimens.galaxySpecimenView.renderModalForSpecimen(a)}),Backbone.history.start()}});return{GalaxyApp:e}});
//# sourceMappingURL=../maps/galaxy.specimens.js.map