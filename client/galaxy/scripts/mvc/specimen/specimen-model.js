define([], function() {

var Specimen = Backbone.Model.extend({

  defaults: {
    'sample_data': {
        'genotype_flag' : false,
        'haplotype_flag' : false,
        'sanger_seq_flag' : false,
        'ngs_seg_flag' : false,
        'dd_pcr_flag' : false
    }
  },

  url: function() {
    if (this.get('project_id') && this.id){
        return '/api/projects/' + this.get('project_id') + '/specimens/' + this.id;
    } else {
        return '/api/projects/' + this.get('project_id') + '/specimens'
    }
  },

  getParsedLocation: function(){
    var location = this.get('sample_data').location;
    if (location.length > 0){
        var location_array = location.split('-');
        for (var i = 0; i < location_array.length; i++) {
            location_array[i] = location_array[i].split('_')[1]
        };
        if (location_array.length !== 5){
            console.log('Invalid location: ' + location);
            return []
        }
        return location_array
    } else {
        return []
    }
  },

  serializeLocation: function(location_array){
    var LOCATIONS_DEFINITION = ['fridge', 'shelf', 'rack', 'box', 'spot'];
    if (location_array.length !== 6){
        throw new Error('Invalid location: ' + location_array);
    }
    var valid_locations = [];
    for (var i = 0; i < 4; i++) {
        valid_locations[i] = LOCATIONS_DEFINITION[i] + '_' + location_array[i];
    };
    var axis_1 = (location_array[4] === null) ? '' : location_array[4]
    var axis_2 = (location_array[5] === null) ? '' : location_array[5]
    if (axis_1 !== 'none' && axis_2 !== 'none'){
        valid_locations[4] = LOCATIONS_DEFINITION[4] + '_' + axis_1 + axis_2;
    } else{
        valid_locations[4] = LOCATIONS_DEFINITION[4] + '_';
    }

    return valid_locations.join('-');
  },

  validate_location: function(){

  },

  getParsedType: function(){
    var type = this.get('sample_data').type;
    if (type.length > 0){
        var types_array = type.split('-');
        if (types_array.length > 3){
           console.log('Invalid specimen type: ' + type);
           return []
        }
        return types_array
    } else {
        return []
    }   
  },

  serializeType: function(types_array){
    if (types_array.length > 3){
        throw new Error('Invalid specimen type: ' + types_array);
    }
    var valid_types = [];
    for (var i = 0; i < types_array.length; i++) {
        if (types_array[i] !== 'none' && types_array[i] !== '' ){
            valid_types.push(types_array[i]);
        }
    };
    var serialized_type = valid_types.join('-');
    return serialized_type
  },

  validateType: function(){

  }

});

// SPECIMENS
var Specimens = Backbone.Collection.extend({
    model: Specimen,
    url: '/api/projects/f2db41e1fa331b3e/specimens'
});

  return {
    Specimen: Specimen,
    Specimens: Specimens
};

});
