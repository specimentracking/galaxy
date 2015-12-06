define([
    "mvc/specimen/specimen-model",
    "mvc/ui/ui-modal", 
    "galaxy.masthead", 
    "utils/utils",
    "libs/toastr"
], function(
    mod_specimen_model,
    mod_modal,
    mod_masthead,
    mod_utils,
    mod_toastr
) {

var FilterView = Backbone.View.extend({

  el: '#center',

  events: {
    'click #btn_toggle_filter' : 'toggleFilter',
    'click #btn_clear_filter' : 'clearFilter',
    'keyup #filter_family' : 'applyFilter',
    'keyup #filter_barcode' : 'applyFilter',
    'change #filter_state' : 'applyFilter',
    'change #filter_type_1' : 'applyFilter',
    'change #filter_type_2' : 'applyFilter',
    'change #filter_type_3' : 'applyFilter'

  },

  initialize: function(){

  },

  render: function(){
    var filter_template = this.templateFilter()
    this.$el.html(filter_template())
  },

  toggleFilter: function(event){
    event.preventDefault();

    $('#filter_form').slideToggle();
    $('#btn_apply_filter').fadeToggle();
    $('#btn_clear_filter').fadeToggle();

    var $filter_button = $('#btn_toggle_filter')
    if ($filter_button.text() === 'Show Filter'){
      $filter_button.text('Hide Filter');
    } else {
      $filter_button.text('Show Filter');
    }
    
  },

  clearFilter: function(){
    $('#filter_family').val('');
    $('#filter_barcode').val('');
    $('#filter_state').val(null);
    Galaxy.specimens.galaxySpecimenView.render();
  },

  applyFilter: function(){
    var filtered_family = $('#filter_family').val();
    var filtered_barcode = $('#filter_barcode').val();
    var filtered_states_array = $('#filter_state').val();
    var filtered_type_array_1 = $('#filter_type_1').val();
    var filtered_type_array_2 = $('#filter_type_2').val();
    var filtered_type_array_3 = $('#filter_type_3').val();
    var specimens_to_render = Galaxy.specimens.galaxySpecimenView.collection;

    if (specimens_to_render !== null){
        if (filtered_family !== ''){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    return specimen.get("sample_data").family === filtered_family;
                    });
        }
        if (filtered_barcode !== ''){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    return specimen.get("bar_code") === filtered_barcode;
                    });
        }
        if (filtered_states_array !== null && filtered_states_array.length > 0){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    return ( -1 !== jQuery.inArray(specimen.get("sample_data").state, filtered_states_array) );
                    });
        }
        if (filtered_type_array_1 !== null && filtered_type_array_1.length > 0){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    var stored_type = specimen.get("sample_data").type;
                    if (stored_type !== null && typeof specimen.get("sample_data").type !== 'undefined'){
                      var stored_types_splitted = specimen.get("sample_data").type.split('-');
                      return ( -1 !== jQuery.inArray(stored_types_splitted[0], filtered_type_array_1));
                    } else {
                      return false
                    }
                })
        }
        if (filtered_type_array_2 !== null && filtered_type_array_2.length > 0){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    var stored_type = specimen.get("sample_data").type;
                    if (stored_type !== null && typeof specimen.get("sample_data").type !== 'undefined'){
                      var stored_types_splitted = specimen.get("sample_data").type.split('-');
                      if (stored_types_splitted.length > 1){
                          return ( -1 !== jQuery.inArray(stored_types_splitted[1], filtered_type_array_2));
                      } else {
                        return false
                      }
                    } else {
                      return false
                    }
                })
        }
        if (filtered_type_array_3 !== null && filtered_type_array_3.length > 0){
            specimens_to_render = specimens_to_render.filter(function(specimen) {
                    var stored_type = specimen.get("sample_data").type;
                    if (stored_type !== null && typeof specimen.get("sample_data").type !== 'undefined'){
                      var stored_types_splitted = specimen.get("sample_data").type.split('-');
                      if (stored_types_splitted.length > 2){
                          return ( -1 !== jQuery.inArray(stored_types_splitted[2], filtered_type_array_3));
                      } else {
                        return false
                      }
                    } else {
                      return false
                    }
                })
        }
        if (specimens_to_render.length < Galaxy.specimens.galaxySpecimenView.collection.length){
            Galaxy.specimens.galaxySpecimenView.render(specimens_to_render); // filter doesn't return collection but models array
        } else {
            Galaxy.specimens.galaxySpecimenView.render(); 
        }
    } else {
        Galaxy.specimens.galaxySpecimenView.render(); 
    }
  },

  templateFilter: function(){
    tmpl_array = [];

    tmpl_array.push('<div id="filter_container" style="width: 90%; margin: auto; margin-top:2em; overflow: auto !important; ">');

    // FILTER
    tmpl_array.push('   <button type="button" id="btn_toggle_filter" class="btn btn-primary" style="width: 86px; ">Show Filter</button>');
    // tmpl_array.push('   <button type="button" id="btn_apply_filter" class="btn btn-success" style="display: none; ">Apply Filter</button>');
    tmpl_array.push('   <button type="button" id="btn_clear_filter" class="btn btn-warning" style="display: none; ">Clear Filter</button>');
    tmpl_array.push('         <hr/>');
    tmpl_array.push('         <div id="filter_form" style="display:none; margin-top:0.5em; ">');
    tmpl_array.push('         <div>');
    tmpl_array.push('           <form class="form-inline" role="form">');
    tmpl_array.push('            <div class="form-group">');
    tmpl_array.push('              <input id="filter_family" type="text" class="form-control" placeholder="family">');
    tmpl_array.push('            </div>');
    tmpl_array.push('            <div class="form-group">');
    tmpl_array.push('              <input id="filter_barcode" type="text" class="form-control" placeholder="barcode">');
    tmpl_array.push('            </div>');
    tmpl_array.push('               <div class="form-group">');
    tmpl_array.push('                   <select id="filter_state" multiple class="form-control">');
    tmpl_array.push('                       <option>new</option>');
    tmpl_array.push('                       <option>onroad</option>');
    tmpl_array.push('                       <option>psu</option>');
    tmpl_array.push('                       <option>depleted</option>');
    tmpl_array.push('                       <option>lost</option>');
    tmpl_array.push('                       <option>discarded</option>');
    tmpl_array.push('                   </select>');  
    tmpl_array.push('               </div>');
    tmpl_array.push('               <div class="form-group">');
    tmpl_array.push('                   <select id="filter_type_1" multiple class="form-control">');
    tmpl_array.push('                       <option>blood</option>');
    tmpl_array.push('                       <option>buccal</option>');
    tmpl_array.push('                       <option>hair</option>');
    tmpl_array.push('                       <option>breastmilk</option>');
    tmpl_array.push('                       <option>stool</option>');
    tmpl_array.push('                       <option>vaginal_swab</option>');
    tmpl_array.push('                       <option>placenta</option>');
    tmpl_array.push('                       <option>cord_blood</option>');
    tmpl_array.push('                       <option>tissue</option>');
    tmpl_array.push('                       <option>rectal_swab</option>');
    tmpl_array.push('                       <option>skin_swab</option>');
    tmpl_array.push('                   </select>');
    tmpl_array.push('               </div>');
    tmpl_array.push('               <div class="form-group">');
    tmpl_array.push('                   <select id="filter_type_2" multiple style="height:42px;" class="form-control" size="2">');
    tmpl_array.push('                       <option>dna</option>');
    tmpl_array.push('                       <option>rna</option>');
    tmpl_array.push('                   </select>'); 
    tmpl_array.push('               </div>');
    tmpl_array.push('               <div class="form-group">');
    tmpl_array.push('                   <select id="filter_type_3" multiple style="height:63px;" class="form-control" size="3">');
    tmpl_array.push('                       <option>library</option>');
    tmpl_array.push('                       <option>amplicon</option>');
    tmpl_array.push('                       <option>enriched_mtdna</option>');
    tmpl_array.push('                   </select>'); 
    tmpl_array.push('               </div>');
    tmpl_array.push('           </form>');
    tmpl_array.push('         </div>');
    tmpl_array.push('         <hr/>');
    tmpl_array.push('         </div>');
    tmpl_array.push('         <div id="specimens_element">');
    tmpl_array.push('         </div>');
    tmpl_array.push('         </div>');

    return _.template(tmpl_array.join(''));
  }

});
  return {
    FilterView: FilterView
};

});
