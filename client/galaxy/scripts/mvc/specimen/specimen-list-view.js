define([
    "mvc/specimen/specimen-model",
    "mvc/specimen/specimen-filter-view",
    "mvc/ui/ui-modal", 
    "galaxy.masthead", 
    "utils/utils",
    "libs/toastr"
], function(
    mod_specimen_model,
    mod_filter_view,
    mod_modal,
    mod_masthead,
    mod_utils,
    mod_toastr
) {

var GalaxySpecimenView = Backbone.View.extend({
  el: '#specimens_element',
  
  events: {
    'click tr' : 'rowClicked'
  },
  
  modal : null,

  collection : null,
  
  initialize: function(){
    this.modal = Galaxy.modal;
    this.collection = new mod_specimen_model.Specimens();
    this.fetchCollection();
  },

  fetchCollection: function(){
    var that = this;
    this.collection.fetch({
      success: function(specimens){
        that.render(specimens.models);
      },
      error: function(model, response){
        if (response.statusCode().status === 403){
            mod_toastr.info( 'You don\'t have proper role to access the specimens within this project.' );   
        } else {
            mod_toastr.error( 'An error occured. Please try again.' );
        }
      }
    })
  },

  render: function( models ){
    var template = this.templateSpecimenList();
    var specimens_to_render = null

    if (this.collection !== null && typeof models === 'undefined'){
        specimens_to_render = this.collection.models;
    } else if (models !== null){
        specimens_to_render = models;
    }
    $("#center").css('overflow','auto');
    this.setElement($('#specimens_element'));
    this.$el.html(template({ specimens : specimens_to_render }));
  },

  rowClicked: function(event){
    var specimen_id = $(event.target.parentElement).data('id')
    Galaxy.specimens.specimenRouter.navigate('specimens/' + specimen_id, {trigger: true, replace: true});
  },

  renderModalForSpecimen: function(id){
    var self = this;
    var template = this.templateSpecimenDetailModal();
    this.modal.show({
        closing_events  : true,
        height          : '600px',
        title           : 'Specimen details',
        closing_callback: function(){
                            Galaxy.specimens.specimenRouter.navigate('/', {trigger: false, replace: true});
                          },
        body            : template({specimen: self.collection.get(id)}),
        buttons         : {
            'Save modifications'    : function() {self.saveModification(id);},
            'Cancel modifications'  : function() {self.cancelModification(id);},
            'Modify'                : function() {self.enableSpecimenModification(id);},
            'Close'                 : function() {self.modal.hide();}
        }
    });
    this.modal.hideButton('Save modifications');
    this.modal.hideButton('Cancel modifications');
  },

  saveModification: function(specimen_id){
    var specimen = this.collection.get(specimen_id);

    var sample_data = specimen.get('sample_data');
    // state
    sample_data.state = (sample_data.state === $('#input_data_state').text()) ? sample_data.state : $('#input_data_state').val();

    // type
    var type_array = [];
    type_array[0] = $('#input_data_type_1').val()
    type_array[1] = $('#input_data_type_2').val()
    type_array[2] = $('#input_data_type_3').val()
    sample_data.type = specimen.serializeType(type_array);

    // location
    var location_array = [];
    location_array[0] = $('#input_data_location_fridge').val();
    location_array[1] = $('#input_data_location_shelf').val();
    location_array[2] = $('#input_data_location_rack').val();
    location_array[3] = $('#input_data_location_box').val();
    location_array[4] = $('#input_data_location_spot_1').val();
    location_array[5] = $('#input_data_location_spot_2').val();
    sample_data.location = specimen.serializeLocation(location_array);

    // note
    sample_data.note = (sample_data.note === $('#input_data_note').val()) ? sample_data.note : $('#input_data_note').val();
    // participant id
    // sample_data.participant_id = (sample_data.note === $('#input_data_participant_id').val()) ? sample_data.participant_id : $('#input_data_participant_id').val();
    // participant relationship
    sample_data.participant_relationship = (sample_data.participant_relationship === $('#input_data_participant_relationship').val()) ? sample_data.participant_relationship : $('#input_data_participant_relationship').val();
    // sex
    sample_data.sex = (sample_data.sex === $('#input_data_sex').val()) ? sample_data.sex : $('#input_data_sex').val();
    // family
    sample_data.family = (sample_data.family === $('#input_data_family').val()) ? sample_data.family : $('#input_data_family').val();
    // participant_dob
    sample_data.participant_dob = (sample_data.participant_dob === $('#picker_participant_dob').val()) ? sample_data.participant_dob : $('#picker_participant_dob').val();
    // date_sent
    sample_data.date_sent = (sample_data.date_sent === $('#picker_date_sent').val()) ? sample_data.date_sent : $('#picker_date_sent').val();
    // date_of_collection
    sample_data.date_of_collection = (sample_data.date_of_collection === $('#picker_date_of_collection').val()) ? sample_data.date_of_collection : $('#picker_date_of_collection').val();
    // GEN
    sample_data.genotype_flag = $('#specimen_data_genotype_flag').hasClass('data-generated') ? true : false;
    // HAP
    sample_data.haplotype_flag = $('#specimen_data_haplotype_flag').hasClass('data-generated') ? true : false;
    // SGR
    sample_data.sanger_seq_flag = $('#specimen_data_sanger_seq_flag').hasClass('data-generated') ? true : false;
    // NGS
    sample_data.ngs_seg_flag = $('#specimen_data_ngs_seg_flag').hasClass('data-generated') ? true : false;
    // PCR
    sample_data.dd_pcr_flag = $('#specimen_data_dd_pcr_flag').hasClass('data-generated') ? true : false;

    var that = this;
    specimen.save({'sample_data' : sample_data}, {
        patch: true,
        success: function (specimen) {
            mod_toastr.success('Saved');
            $('.data-existence').off('click', that.toggle_data_presence)
            that.renderModalForSpecimen(specimen_id);
            that.render();
        },
        error: function(model, response) {
            mod_toastr.error('An error occured while saving. Please try again.');
        }
    });

  },

  cancelModification: function(id){
    this.renderModalForSpecimen(id);
    $('.data-existence').off('click', this.toggle_data_presence)
  },

  // function handles the behavior of data-presence flags (NGS, PCR etc.)
  toggle_data_presence: function(event){
    var $element = $(event.target);
    if ($element.hasClass('data-not-generated')){
        $element.removeClass('data-not-generated');
        $element.addClass('data-generated');
    } else {
        $element.addClass('data-not-generated');
        $element.removeClass('data-generated');
    }
  },

  enableSpecimenModification: function(specimen_id){
    this.modal.showButton('Save modifications');
    this.modal.showButton('Cancel modifications');
    this.modal.hideButton('Modify');

    $('.data-existence').on('click', this.toggle_data_presence).addClass('data-modification');

    var specimen = this.collection.get(specimen_id);

    // state
    var template = this.templateStateOptions();
    var new_html = '<select id="input_data_state" class="form-control">' + template() + '</select>';
    $('#specimen_state').html(new_html);
    $('#input_data_state').val(specimen.get('sample_data').state);

    // type
    var current_type = specimen.get('sample_data').type;
    var parsed_type_array = [];
    if (typeof current_type !== 'undefined' && current_type !== null && current_type.length > 0){
        parsed_type_array = specimen.getParsedType(current_type);
    }

    var template = this.templateTypeOptions();
    var new_html = template();
    $('#specimen_type').html(new_html);
    if (parsed_type_array.length >0){
        $('#input_data_type_1').val(parsed_type_array[0]);
    }
    if (parsed_type_array.length >1){
        $('#input_data_type_2').val(parsed_type_array[1]);
    }
    if (parsed_type_array.length >2){
        $('#input_data_type_3').val(parsed_type_array[2]);
    }

    // location
    var current_location = specimen.get('sample_data').location;
    if (typeof current_location !== 'undefined' && current_location !== null && current_location.length > 0){
        var parsed_location_array = specimen.getParsedLocation();
    }
    var template = this.templateLocationOptions();
    $('#specimen_location').html(template());
    if (typeof parsed_location_array !== 'undefined' && parsed_location_array.length === 5){
        $('#input_data_location_fridge').val(parsed_location_array[0]);
        $('#input_data_location_shelf').val(parsed_location_array[1]);
        $('#input_data_location_rack').val(parsed_location_array[2]);
        $('#input_data_location_box').val(parsed_location_array[3]);
        $('#input_data_location_spot_1').val(parsed_location_array[4].slice(0,1)[0]);
        $('#input_data_location_spot_2').val(parsed_location_array[4].slice(1,2)[0]);
    }

    // note
    var new_html = '<textarea id="input_data_note" type="text" class="form-control" placeholder="note" rows="2">';
    $('#specimen_note').html(new_html);
    $('#input_data_note').val(specimen.get('sample_data').note);

    // date_of_collection
    var template = this.templateDatePicker();
    $('#specimen_data_date_of_collection').html(template( {input_id: 'picker_date_of_collection'} ));

    // date of birth
    $('#specimen_data_participant_dob').html(template( {input_id: 'picker_participant_dob'} ));

    // date sent
    $('#specimen_data_date_sent').html(template( {input_id: 'picker_date_sent'} ));


    $('#picker_date_of_collection').datepicker('update', specimen.get('sample_data').date_of_collection);
    $('#picker_participant_dob').datepicker('update', specimen.get('sample_data').participant_dob);
    $('#picker_date_sent').datepicker('update', specimen.get('sample_data').date_sent);
    
    // make datepicker alive
    $('.input-group.date').datepicker({
        todayBtn: "linked",
        autoclose: true,
        todayHighlight: true
    });

    // participant relationship
    var current_relationship = specimen.get('sample_data').participant_relationship;
    var new_html = '<input id="input_data_participant_relationship" type="text" class="form-control" placeholder="relationship">';
    $('#specimen_data_participant_relationship').html(new_html);
    if (typeof current_relationship !== undefined){
        $('#input_data_participant_relationship').val(current_relationship);
    }
    // sex
    var current_sex = specimen.get('sample_data').sex;
    var new_html = '<input id="input_data_sex" type="text" class="form-control" placeholder="sex">';
    $('#specimen_data_sex').html(new_html);
    if (typeof current_sex !== undefined){
        $('#input_data_sex').val(current_sex);
    }
    // family
    var current_family = specimen.get('sample_data').family;
    var new_html = '<input id="input_data_family" type="text" class="form-control" placeholder="family">';
    $('#specimen_data_family').html(new_html);
    if (typeof current_family !== undefined){
        $('#input_data_family').val(current_family);
    }

  },

  templateDatePicker: function(){
    var tmpl_array = [];       

    tmpl_array.push('<div class="input-group date">');
    tmpl_array.push('<input id="<%= input_id %>" type="text" class="form-control"><span class="input-group-addon"><i class="fa fa-calendar"></i></span>');
    tmpl_array.push('</div>');

    return _.template(tmpl_array.join(''));
  },

  templateLocationOptions: function(){
    var tmpl_array = [];    
    
    tmpl_array.push('<form class="form-inline" role="form">');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<input id="input_data_location_fridge" type="text" class="form-control" placeholder="fridge">');
    tmpl_array.push('</div>');  
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<input id="input_data_location_shelf" type="text" class="form-control" placeholder="shelf">');  
    tmpl_array.push('</div>');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<input id="input_data_location_rack" type="text" class="form-control" placeholder="rack">');
    tmpl_array.push('</div>');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<input id="input_data_location_box" type="text" class="form-control" placeholder="box">');
    tmpl_array.push('</div>');
    tmpl_array.push('spot: <div class="form-group">');
    tmpl_array.push('<select id="input_data_location_spot_1" class="form-control">');
    tmpl_array.push('   <option value="none"></option>');
    tmpl_array.push('   <option value="A">A</option>');
    tmpl_array.push('   <option value="B">B</option>');
    tmpl_array.push('   <option value="C">C</option>');
    tmpl_array.push('   <option value="D">D</option>');
    tmpl_array.push('   <option value="E">E</option>');
    tmpl_array.push('   <option value="F">F</option>');
    tmpl_array.push('   <option value="G">G</option>');
    tmpl_array.push('   <option value="H">H</option>');
    tmpl_array.push('   <option value="I">I</option>');
    tmpl_array.push('</select>');
    tmpl_array.push('</div>');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<select id="input_data_location_spot_2" class="form-control">');
    tmpl_array.push('   <option value="none"></option>');
    tmpl_array.push('   <option value="1">1</option>');
    tmpl_array.push('   <option value="2">2</option>');
    tmpl_array.push('   <option value="3">3</option>');
    tmpl_array.push('   <option value="4">4</option>');
    tmpl_array.push('   <option value="5">5</option>');
    tmpl_array.push('   <option value="6">6</option>');
    tmpl_array.push('   <option value="7">7</option>');
    tmpl_array.push('   <option value="8">8</option>');
    tmpl_array.push('   <option value="9">9</option>');
    tmpl_array.push('</select>');
    tmpl_array.push('</div>');
    tmpl_array.push('</form>');

    return _.template(tmpl_array.join(''));
  },

  templateTypeOptions: function(){
    var tmpl_array = [];    
    
    tmpl_array.push('<form class="form-inline" role="form">');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<select id="input_data_type_1" class="form-control">');
    tmpl_array.push('   <option value="none"></option>');
    tmpl_array.push('   <option value="blood">blood</option>');
    tmpl_array.push('   <option value="buccal">buccal</option>');
    tmpl_array.push('   <option value="hair">hair</option>');
    tmpl_array.push('   <option value="breastmilk">breastmilk</option>');
    tmpl_array.push('   <option value="stool">stool</option>');
    tmpl_array.push('   <option value="vaginal_swab">vaginal_swab</option>');
    tmpl_array.push('   <option value="placenta">placenta</option>');
    tmpl_array.push('   <option value="cord_blood">cord_blood</option>');
    tmpl_array.push('   <option value="tissue">tissue</option>');
    tmpl_array.push('</select>');  
    tmpl_array.push('</div>');  
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<select id="input_data_type_2" class="form-control">');
    tmpl_array.push('   <option value="none"></option>');
    tmpl_array.push('   <option value="dna">dna</option>');
    tmpl_array.push('   <option value="rna">rna</option>');
    tmpl_array.push('</select>');    
    tmpl_array.push('</div>');
    tmpl_array.push('<div class="form-group">');
    tmpl_array.push('<select id="input_data_type_3" class="form-control">');
    tmpl_array.push('   <option value="none"></option>');
    tmpl_array.push('   <option value="amplicon">amplicon</option>');
    tmpl_array.push('   <option value="library">library</option>');
    tmpl_array.push('   <option value="enriched_mtdna">enriched_mtdna</option>');
    tmpl_array.push('</select>');
    tmpl_array.push('</div>');
    tmpl_array.push('</form>');

    return _.template(tmpl_array.join(''));
  },

  templateStateOptions: function(){
    var tmpl_array = [];    
    
    tmpl_array.push('<option value="new">new</option>');
    tmpl_array.push('<option value="onroad">onroad</option>');
    tmpl_array.push('<option value="psu">psu</option>');
    tmpl_array.push('<option value="depleted">depleted</option>');
    tmpl_array.push('<option value="lost">lost</option>');
    tmpl_array.push('<option value="discarded">discarded</option>');

    return _.template(tmpl_array.join(''));
  },

  templateSpecimenDetailModal: function(){
    var tmpl_array = [];
    
    tmpl_array.push('<div>');
    tmpl_array.push('   <table class="specimen-modal-table table table-striped table-condensed">');

    tmpl_array.push('   <% if (specimen.get("sample_data").family) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">family</th>');
    tmpl_array.push('           <td id="specimen_data_family"><%= _.escape(specimen.get("sample_data").family) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    tmpl_array.push('   <% if (specimen.get("sample_data").participant_relationship) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">participant_relationship</th>');
    tmpl_array.push('           <td id="specimen_data_participant_relationship"><%= _.escape(specimen.get("sample_data").participant_relationship) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    tmpl_array.push('   <% if (specimen.get("sample_data").sex) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">sex</th>');
    tmpl_array.push('           <td id="specimen_data_sex"><%= _.escape(specimen.get("sample_data").sex) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">state</th>');
    tmpl_array.push('           <td id="specimen_state"><%= _.escape(specimen.get("sample_data").state) %></td>');
    tmpl_array.push('       </tr>');

    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">type</th>');
    tmpl_array.push('           <td id="specimen_type"><%= _.escape(specimen.get("sample_data").type) %></td>');
    tmpl_array.push('       </tr>');
    

    tmpl_array.push('   <% if (specimen.get("sample_data").location) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">location</th>');
    tmpl_array.push('           <td id="specimen_location"><%= _.escape(specimen.get("sample_data").location) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    tmpl_array.push('   <% if (specimen.get("sample_data").parent_id) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">derivate of</th>');
    tmpl_array.push('           <td><a title="Click to see the closest ancestor" href="#specimens/<%- specimen.get("sample_data").parent_id %>"><%= _.escape(specimen.get("sample_data").parent_id) %></a></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    tmpl_array.push('   <% if (specimen.get("sample_data").note) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">note</th>');
    tmpl_array.push('           <td id="specimen_note"><%= _.escape(specimen.get("sample_data").note) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');

    
    tmpl_array.push('   <% if (specimen.get("sample_data").date_sent) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">date_sent</th>');
    tmpl_array.push('           <td id="specimen_data_date_sent"><%= _.escape(specimen.get("sample_data").date_sent) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');
    
    tmpl_array.push('   <% if (specimen.get("sample_data").date_of_collection) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">date_of_collection</th>');
    tmpl_array.push('           <td id="specimen_data_date_of_collection"><%= _.escape(specimen.get("sample_data").date_of_collection) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');
    
    tmpl_array.push('   <% if (specimen.get("sample_data").participant_dob) { %>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">participant_dob</th>');
    tmpl_array.push('           <td id="specimen_data_participant_dob"><%= _.escape(specimen.get("sample_data").participant_dob) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   <% } %>');
    

    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">generated_data</th>');
    tmpl_array.push('           <td>');
    tmpl_array.push('              <% if (specimen.get("sample_data").genotype_flag === true) { %>');
    tmpl_array.push('              <span id="specimen_data_genotype_flag" class="data-existence data-generated">'); 
    tmpl_array.push('              <% } else { %>');
    tmpl_array.push('              <span id="specimen_data_genotype_flag" class="data-existence data-not-generated">');
    tmpl_array.push('              <% } %>');
    tmpl_array.push('              GEN');
    tmpl_array.push('              </span>');
    tmpl_array.push('              <% if (specimen.get("sample_data").haplotype_flag === true) { %>');
    tmpl_array.push('              <span id="specimen_data_haplotype_flag" class="data-existence data-generated">'); 
    tmpl_array.push('              <% } else { %>');
    tmpl_array.push('              <span id="specimen_data_haplotype_flag" class="data-existence data-not-generated">');
    tmpl_array.push('              <% } %>');
    tmpl_array.push('              HAP');
    tmpl_array.push('              </span>');
    tmpl_array.push('              <% if (specimen.get("sample_data").sanger_seq_flag === true) { %>');
    tmpl_array.push('              <span id="specimen_data_sanger_seq_flag" class="data-existence data-generated">'); 
    tmpl_array.push('              <% } else { %>');
    tmpl_array.push('              <span id="specimen_data_sanger_seq_flag" class="data-existence data-not-generated">');
    tmpl_array.push('              <% } %>');
    tmpl_array.push('              SGR');
    tmpl_array.push('              </span>');
    tmpl_array.push('              <% if (specimen.get("sample_data").ngs_seg_flag === true) { %>');
    tmpl_array.push('              <span id="specimen_data_ngs_seg_flag" class="data-existence data-generated">'); 
    tmpl_array.push('              <% } else { %>');
    tmpl_array.push('              <span id="specimen_data_ngs_seg_flag" class="data-existence data-not-generated">');
    tmpl_array.push('              <% } %>');
    tmpl_array.push('              NGS');
    tmpl_array.push('              </span>');
    tmpl_array.push('              <% if (specimen.get("sample_data").dd_pcr_flag === true) { %>');
    tmpl_array.push('              <span id="specimen_data_dd_pcr_flag" class="data-existence data-generated">'); 
    tmpl_array.push('              <% } else { %>');
    tmpl_array.push('              <span id="specimen_data_dd_pcr_flag" class="data-existence data-not-generated">');
    tmpl_array.push('              <% } %>');
    tmpl_array.push('              PCR');
    tmpl_array.push('              </span>');
    tmpl_array.push('           </td>');
    tmpl_array.push('       </tr>');

    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">create_time</th>');
    tmpl_array.push('           <td><%= _.escape(specimen.get("create_time")) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">update_time</th>');
    tmpl_array.push('           <td><%= _.escape(specimen.get("update_time")) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">barcode</th>');
    tmpl_array.push('           <td><%= _.escape(specimen.get("bar_code")) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('       <tr>');
    tmpl_array.push('           <th scope="row">ID</th>');
    tmpl_array.push('           <td><%= _.escape(specimen.get("id")) %></td>');
    tmpl_array.push('       </tr>');
    tmpl_array.push('   </table>');
    tmpl_array.push('</div>');

    // LINEAGE
    tmpl_array.push('<div>');
    tmpl_array.push('   <% if (specimen.get("lineage_path")) { %>');
    tmpl_array.push('       <h5>Lineage</h5>');
    tmpl_array.push('       <ol class="breadcrumb">');
    tmpl_array.push('           <% _.each(specimen.get("lineage_path"), function(id, index) { %>');
    tmpl_array.push('           <% if (specimen.get("id") != id) { %>');
    tmpl_array.push('               <li>');
    tmpl_array.push('                   <a title="Go to this specimen" href="#/specimens/<%- id %>">ancestor (distance <% print( specimen.get("lineage_path").length - index -1 ) %>)</a>');
    tmpl_array.push('               </li>');
    tmpl_array.push('           <% } %>');
    tmpl_array.push('           <% }); %>');
    tmpl_array.push('           </ol>');
    tmpl_array.push('   <% } %>');
    tmpl_array.push('</div>');

    return _.template(tmpl_array.join(''));
  },


  templateSpecimenList: function(){
    tmpl_array = [];

    //SPECIMEN TABLE
    tmpl_array.push('   <% if (specimens !== null) { %>'); // we received data
    tmpl_array.push('   <div>');
    tmpl_array.push('   Showing <%= specimens.length %> specimens.');
    tmpl_array.push('   </div>');
    tmpl_array.push('   <table class="specimen-table table table-condensed">');
    tmpl_array.push('   <thead>');
    tmpl_array.push('     <th style="width: 3em;">fam</th>');
    tmpl_array.push('     <th style="width: 3em;">rel</th>');
    tmpl_array.push('     <th style="width: 3em;">sex</th>');
    tmpl_array.push('     <th style="width: 5em;">state</th>');
    tmpl_array.push('     <th style="width: 14em;">type</th>');
    tmpl_array.push('     <th style="width: 24em;">location</th>');
    tmpl_array.push('     <th style="width: 5em;">collected</th>');
    tmpl_array.push('     <th style="width: 3em;">derivate</th>');
    tmpl_array.push('     <th>note</th>');
    tmpl_array.push('   </thead>');
    tmpl_array.push('   <tbody>');
    tmpl_array.push('       <% _.each(specimens, function(specimen) { %>');
    tmpl_array.push('           <tr data-id="<%= _.escape(specimen.id) %>">');
    tmpl_array.push('               <td><%- specimen.get("sample_data").family %></td>');
    tmpl_array.push('               <td><%- specimen.get("sample_data").participant_relationship %></td>');
    tmpl_array.push('               <td><%- specimen.get("sample_data").sex %></td>');
    tmpl_array.push('               <td><%= _.escape(specimen.get("sample_data").state) %></td>');
    tmpl_array.push('               <td><%= _.escape(specimen.get("sample_data").type) %></td>');
    tmpl_array.push('               <td><%= _.escape(specimen.get("sample_data").location) %></td>');
    tmpl_array.push('               <td><%= _.escape(specimen.get("sample_data").date_of_collection) %></td>');
    tmpl_array.push('               <td>');
    tmpl_array.push('                   <% if (specimen.get("sample_data").parent_id != null) { %>');
    tmpl_array.push('                   yes'); // TODO add a link to parent
    tmpl_array.push('                   <% } else { %>');
    tmpl_array.push('                   no');
    tmpl_array.push('                   <% } %>');
    tmpl_array.push('               </td>');
    tmpl_array.push('               <td><%= _.escape(specimen.get("sample_data").note) %></td>');
    tmpl_array.push('           </tr>');
    tmpl_array.push('       <% }); %>');
    tmpl_array.push('   </tbody>');
    tmpl_array.push('   </table>');
    tmpl_array.push('   <% } else { %>'); // we didn't receive data
    tmpl_array.push('       <span>No data received</span>');
    tmpl_array.push('   <% }%>');

    return _.template(tmpl_array.join(''));
  }

});

return {
    GalaxySpecimenView: GalaxySpecimenView
};

});
