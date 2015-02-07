define(["utils/utils","mvc/ui/ui-table","mvc/ui/ui-portlet","mvc/ui/ui-misc"],function(c,a,b,e){var d=Backbone.View.extend({optionsDefault:{title:"Section",max:null,min:null},initialize:function(g){this.options=c.merge(g,this.optionsDefault);this.setElement("<div/>");var f=this;this.button_new=new e.ButtonIcon({icon:"fa-plus",title:"Insert "+g.title_new,tooltip:"Add new "+g.title_new+" block",floating:"clear",onclick:function(){if(g.onnew){g.onnew()}}});this.table=new a.View({cls:"ui-table-plain",content:""});this.$el.append(this.table.$el);this.$el.append($("<div/>").append(this.button_new.$el));this.list={};this.n=0},size:function(){return this.n},add:function(g){if(!g.id||this.list[g.id]){console.debug("tools-repeat::add - Duplicate repeat block id.");return}this.n++;var f=new e.ButtonIcon({icon:"fa-trash-o",tooltip:"Delete this repeat block",cls:"ui-button-icon-plain",onclick:function(){if(g.ondel){g.ondel()}}});var h=new b.View({id:g.id,title:"<b>"+g.title+"</b>",cls:"ui-portlet-repeat",operations:{button_delete:f}});h.append(g.$el);h.$el.addClass("section-row");this.list[g.id]=h;this.table.add(h.$el);this.table.append("row_"+g.id,true);if(this.options.max>0&&this.n>=this.options.max){this.button_new.disable()}this._refresh()},del:function(g){if(!this.list[g]){console.debug("tools-repeat::del - Invalid repeat block id.");return}this.n--;var f=this.table.get("row_"+g);f.remove();delete this.list[g];this.button_new.enable();this._refresh()},_refresh:function(){var f=0;for(var h in this.list){var g=this.list[h];g.title(++f+": "+this.options.title);if(this.n>this.options.min){g.showOperation("button_delete")}else{g.hideOperation("button_delete")}}}});return{View:d}});