// /js/helloworld.js
define([
    "core/js/adapt",
    "core/js/views/componentView",
    "core/js/models/componentModel"
], function(Adapt, ComponentView, ComponentModel) {

    var MyPluginView = ComponentView.extend({
       // implement your component view
    });

    var MyPluginModel = ComponentModel.extend({
       // implement your component model
    });

    return Adapt.register("myplugin", {
       view: MyPluginView,
       model: MyPluginModel
    });

});
