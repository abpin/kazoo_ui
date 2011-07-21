winkstart.module('voip', 'callflow',
   {
      css: [
         'css/style.css',
         'css/popups.css',
         'css/callflow.css'
      ],

      templates: {
         callflow: 'tmpl/callflow.html',
         callflow_main: 'tmpl/callflow_main.html',
         branch: 'tmpl/branch.html',
         tools: 'tmpl/tools.html',
         root: 'tmpl/root.html',
         node: 'tmpl/node.html',
         add_number: 'tmpl/add_number.html',
         edit_dialog: 'tmpl/edit_dialog.html'
      },

      elements: {
         flow: '#ws_cf_flow',
         tools: '#ws_cf_tools',
         save: '#ws_cf_save',
         buf: '#ws_cf_buf'
      },

      actions: {
          "root"        : { "name" : "root",        "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "false"},
          "device"      : { "name" : "device",      "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "conference"  : { "name" : "conference",  "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "menu"        : { "name" : "menu",        "rules" : [ {"type" : "quantity", "maxSize" : "9"} ], "isUsable" : "true"},
          "callflow"    : { "name" : "callflow",    "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "voicemail"   : { "name" : "voicemail",   "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "play"        : { "name" : "play",        "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "offnet"      : { "name" : "offnet",      "rules" : [ {"type" : "quantity", "maxSize" : "9"} ], "isUsable" : "true"},
          "ring_group"  : { "name" : "ring_group",  "rules" : [ {"type" : "quantity", "maxSize" : "1"} ], "isUsable" : "true"},
          "temporal_route"  : { "name" : "temporal_route",  "rules" : [ {"type" : "quantity", "maxSize" : "9"} ], "isUsable" : "true"},
      },

      type_map: {
         "device": "device",
         "menu": "menu",
         "play": "media",
         "voicemail": "vmbox",
         "callflow": "callflow",
         "conference": "conference"
      },

      menu_options: {
        "_": "default action",
        "0": "0",
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "7": "7",
        "8": "8",
        "9": "9",
        "*": "*",
        "#": "#"
      },

      categories: {
         "basic" : ["device","voicemail","menu","temporal_route","offnet","play","conference","callflow"]//,
         //"dia:lplan": ["answer", "hangup", "tone"]
      },

      subscribe: {
         'callflow.activate' : 'activate',
         'callflow.list-panel-click' : 'editCallflow',
         'callflow.edit-callflow' : 'editCallflow'
      },
      resources: {
            "callflow.list": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/callflows',
                contentType: 'application/json',
                verb: 'GET'
            },
            "callflow.get": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/callflows/{callflow_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            "callflow.create": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/callflows',
                contentType: 'application/json',
                verb: 'PUT'
            },
            "callflow.update": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/callflows/{callflow_id}',
                contentType: 'application/json',
                verb: 'POST'
            },
            "callflow.delete": {
                url: CROSSBAR_REST_API_ENDPOINT + '/accounts/{account_id}/callflows/{callflow_id}',
                contentType: 'application/json',
                verb: 'DELETE'
            }
      }

   },
   function (args) {
        winkstart.registerResources(this.config.resources);

        winkstart.publish('subnav.add', {
            whapp: 'voip',
            module: this.__module,
            label: 'Callflows',
            icon: 'callflow'
            weight: '50'
        });
   },
   {
      activate: function () {
         var THIS = this;

         $('#ws-content').empty();
         THIS.templates.callflow_main.tmpl({}).appendTo($('#ws-content'));
         THIS.renderList( function() { 
            THIS.templates.callflow.tmpl(THIS.config.elements).appendTo($('#callflow-view'));
            THIS.renderTools();
         });

         THIS.actions = THIS.config.actions;
         THIS.categories = THIS.config.categories;

         $(this.config.elements.save).click(function () { THIS.save(); }).hover(function () { $(this).addClass('active'); }, function () { $(this).removeClass('active'); });
      },

      editCallflow: function(data) {
         var THIS = this;

         THIS._resetFlow();

         if(data && data.id) {
             winkstart.getJSON('callflow.get', {
                crossbar: true,
                account_id: MASTER_ACCOUNT_ID,
                callflow_id: data.id
             }, function(json) {
                THIS._resetFlow();
                THIS.flow.id = json.data.id;
                if(json.data.flow.module != undefined) {
                    THIS.flow.root = THIS.buildFlow(json.data.flow, THIS.flow.root, 0, '_');
                }
                THIS.flow.numbers = json.data.numbers;
                THIS.renderFlow();
             });
         }
         else {
            THIS._resetFlow();
            THIS.renderFlow();
         }
      },

      buildFlow: function (json, parent, id, key) {
         var THIS = this,
             branch = THIS.branch(json.module);

         branch.data.data = json.data;
         branch.id = ++id;
         branch.key = key;

         $.each(json.children, function(key, child) {
            branch = THIS.buildFlow(child, branch, id, key);
         });

         parent.addChild(branch);

         return parent;
      },

      renderFlow: function () {
         var target = $(this.config.elements.flow).empty();
         target.append(this._renderFlow());
      },

      renderTools: function () {
         var target = $(this.config.elements.tools).empty();
         target.append(this._renderTools());
      },

      // Create a new branch node for the flow
      branch: function (actionName) {
         var THIS = this;

         function branch (actionName) {

            // ---------- SO MUCH WIN ON THIS LINE ----------
            var that = this;
            // ----------------------------------------------

            this.id = -1;                   // id for direct access
            //Hack so that resources are treated as offnets
            this.actionName = (actionName == 'resource') ? 'offnet' : actionName;
            this.module = actionName;
            this.key = '_';
            this.parent = null;
            this.children = {};
            this.data = {};                 // data caried by the node

            // returns a list of potential child actions that can be added to the branch
            this.potentialChildren = function () {
               var list = [];

               for (var i in THIS.actions) if (THIS.actions[i].isUsable) list[THIS.actions[i].name] = THIS.actions[i].name;

               for (var i in THIS.actions[this.actionName].rules) {
                  var rule = THIS.actions[this.actionName].rules[i];

                  switch (rule.type) {
                     case 'quantity': {
                        if (THIS._count(this.children) >= rule.maxSize) list = [];
                     } break;
                     // ADD MORE RULE PROCESSING HERE ////////////////////
                  }
               }

               return list;
            }

            this.contains = function (branch) {
               var toCheck = branch;
               while(toCheck.parent) if (this.id == toCheck.id) return true; else toCheck = toCheck.parent;
               return false;
            }

            this.removeChild = function (branch) {

                $.each(this.children, function(i, child) {
                    if(child.id == branch.id) {
                        delete that.children[i];
                    }
                });
            }

            this.addChild = function (branch) {
               if (!(branch.actionName in this.potentialChildren())) return false;
               if (branch.contains(this)) return false;
               if (branch.parent) branch.parent.removeChild(branch);
               branch.parent = this;
               this.children[THIS._count(this.children)] = branch;
               return true;
            }

            this.index = function (index) {
               this.id = index;
               $.each(this.children, function() {
                    index = this.index(index+1);
               });
               return index;
            }

            this.nodes = function () {
               var nodes = {};
               nodes[this.id] = this;
               $.each(this.children, function() {
                  var buf = this.nodes();
                  $.each(buf, function() {
                    nodes[this.id] = this;
                  });
               });
               return nodes;
            }

            this.serialize = function () {
               var json = THIS._clone(this.data);
               json.module = this.module;
               json.children = {};
               $.each(this.children, function() {
                    json.children[this.key] = this.serialize();
               });
               return json;
            }
         }

         return new branch(actionName);
      },
      _count: function(json) {
        var count = 0;
        $.each(json, function() {
            count++;
        });
        return count;
      },

// A set of actions: modules/apps tied together with rules, restricting dependencies between the actions
      root: { name : 'root', rules : [ {type : 'quantity', maxSize : 1} ], isUsable : false},

      actions: { root : this.root },

// Action categories
      categories: { },

      flow: { },

      _resetFlow: function () {
         this.flow = {};
         this.flow.root = this.branch('root');    // head of the flow tree
         this.flow.root.key = 'flow';
         this.flow.numbers = [];
         this._formatFlow();
      },

      _formatFlow: function () {
         this.flow.root.index(0);
         this.flow.nodes = this.flow.root.nodes();
      },



// FLOW /////////////////////////////////////////////////////////////////
      _renderFlow: function () {
         var THIS = this;
         this._formatFlow();

         var layout = this._renderBranch(this.flow.root);

         layout.find('.node').hover(function () { $(this).addClass('over'); }, function () { $(this).removeClass('over'); });

         layout.find('.node').each(function () {
            var node_html, node = THIS.flow.nodes[$(this).attr('id')], $node = $(this);
            if ($node.hasClass('root')) {
               $node.removeClass('icons_black root');
               node_html = THIS.templates.root.tmpl({numbers: THIS.flow.numbers.toString()});

               node_html.find('.btn_plus_sm').click(function() {
                    var dialog = THIS.templates.add_number.tmpl({}).dialog();
                    
                    dialog.find('.submit_btn').click(function() {
                        THIS.flow.numbers.push(dialog.find('#number').val());
                        dialog.dialog('close');
                        THIS.renderFlow();
                    });
               });

               node_html.find('.save').click(function() {
                    THIS.save();
               });

               node_html.find('.trash').click(function() {
                    winkstart.deleteJSON('callflow.delete', {account_id: MASTER_ACCOUNT_ID, callflow_id: THIS.flow.id}, function() {
                        THIS.renderList();
                        THIS._resetFlow();
                        $(THIS.config.elements.flow).empty();
                    });
               });
            }
            else {
               node_html = THIS.templates.node.tmpl(THIS.flow.nodes[$(this).attr('id')]);

               node_html.find('.edit').click(function() {
                    var node_name = node.actionName, general, options;

                    general = function(json, other) {
                        var dialog, data;
                        
                        if(node_name == 'temporal_route') {
                            data = {
                                title: 'Configure your time of day route',
                                objects: {
                                    type: 'Timezone',
                                    items: [ 
                                        {id: 'America/Los_Angeles', name: 'PST'}
                                    ],
                                    selected: (node.data.data == undefined) ? 0 : node.data.data.timezone
                                }
                            };
                        }
                        else if(node_name == 'offnet') {
                            data = {
                                title: 'Configure your offnet',
                                objects: {
                                    type: 'Resource type',
                                    items: [
                                        {id: 'resource', name: 'Local'},
                                        {id: 'offnet', name: 'Global'}
                                    ],
                                    selected: node.module
                                }
                            };
                        }
                        else if(node_name == 'conference') {
                            json.data.push({id:'!', name: '*Conference Server*'});

                            data = {
                                title: 'Configure the conference',
                                objects: {
                                    type: node_name,
                                    items: json.data,
                                    selected: (node.data.data == undefined || node.data.data.id == undefined) ? '!' : node.data.data.id
                                }
                            };
                        }
                        else if(node_name == 'callflow') {
                            var list = [];
                            $.each(json.data, function(i, val) {
                                //Sanity Check! Don't reference the same callflow!
                                if(this.id != THIS.flow.id) {
                                    this.name = this.numbers.toString();
                                    list.push(this);
                                }
                            });

                            data = {
                                title: 'Select the callflow',
                                objects: {
                                    type: node_name,
                                    items: list,
                                    selected: (node.data.data == undefined) ? 0 : node.data.data.id
                                }
                            };
                        }
                        else {
                            data = {
                                title: 'Select the ' + node_name,
                                objects: {
                                    type: node_name,
                                    items: json.data,
                                    selected: (node.data.data == undefined) ? 0 : node.data.data.id
                                }
                            };
                        }

                        if(node.parent.actionName == 'menu') {
                            data.options = {
                                type: 'menu option',
                                items: THIS.config.menu_options,
                                selected: node.key
                            };
                        }
                        else if(node.parent.actionName == 'temporal_route') {
                            data.options = {
                                type: 'temporal rule',
                                items: other,
                                selected: node.key
                            };
                        }

                        dialog = THIS.templates.edit_dialog.tmpl(data).dialog({width: 400});

                        dialog.find('.submit_btn').click(function() {
                            var temp;

                            if(node.data.data == undefined) {
                                node.data.data = {};
                            }

                            if(node.parent.actionName == 'menu' || node.parent.actionName == 'temporal_route') {
                                node.key = $('#option-selector', dialog).val();
                            }

                            if(node_name == 'temporal_route') {
                                node.data.data.timezone = $('#object-selector', dialog).val();
                            }
                            else if(node_name == 'offnet') {
                                node.module = $('#object-selector', dialog).val();
                            }
                            else if(node_name == 'conference') {
                                temp = $('#object-selector', dialog).val();

                                if(temp == '!') {
                                    delete node.data.data.id;
                                }
                                else {
                                    node.data.data.id = temp;
                                }
                            }
                            else {
                                node.data.data.id = $('#object-selector', dialog).val();
                            }

                            dialog.dialog('close');
                            THIS.renderFlow();
                        });
                    };

                    test = function(other) {
                        if(node_name == 'temporal_route' || node_name == 'offnet') {
                            general({}, other);
                        }
                        else {
                            winkstart.getJSON(THIS.config.type_map[node_name] + '.list', {account_id: MASTER_ACCOUNT_ID}, function(json) {
                                general(json, other);
                            });
                        }
                    };

                    if(node.parent.actionName == 'temporal_route') {
                        winkstart.getJSON('timeofday.list', {account_id: MASTER_ACCOUNT_ID}, function(json) {
                            var list = json.data,
                                json_list = {};

                            list.push({name: 'All other times (default action)', id:'_'});

                            $.each(list, function() {
                                json_list[this.id] = this.name;
                            });

                            test(json_list);
                        });
                    }
                    else {
                        test({});
                    }
               });
            }
            $(this).append(node_html);

            $(this).droppable({
               drop: function (event, ui) {
                  var target = THIS.flow.nodes[$(this).attr('id')];
                  if (ui.draggable.hasClass('action')) {
                     var action = ui.draggable.attr('name'),
                         branch = THIS.branch(action);
                     if (target.addChild(branch)) {
                        var popup = THIS.actions[action].popup;
                        if (popup) winkstart.publish(popup+'.popup', target.children[target.children.length-1]);
                        THIS.renderFlow();
                     }
                  }
                  if (ui.draggable.hasClass('node')) {
                     var branch = THIS.flow.nodes[ui.draggable.attr('id')];
                     if (target.addChild(branch)) { ui.draggable.remove(); THIS.renderFlow(); }
                  }
               }
            });

            // dragging the whole branch
            $(this).draggable({
               start: function () {
                  THIS._enableDestinations($(this));

                  var children = $(this).next();
                  var t = children.offset().top - $(this).offset().top;
                  var l = children.offset().left - $(this).offset().left;
                  $(this).attr('t', t); $(this).attr('l', l);
               },
               drag: function () {
                  var children = $(this).next();
                  var t = $(this).position().top + parseInt($(this).attr('t'));
                  var l = $(this).position().left + parseInt($(this).attr('l'));
                  children.offset({ top: t, left: l });
               },
               stop: function () {
                  THIS._disableDestinations();
                  THIS.renderFlow();
               }
            });
         });

         layout.find('.delete').click(function() {
            var node = THIS.flow.nodes[$(this).attr('id')];
            if (node.parent) {
               node.parent.removeChild(node);
               THIS.renderFlow();
            }
         });

         return layout;
      },

      _renderBranch: function (branch) {
         var THIS = this;
         var flow = this.templates.branch.tmpl(branch);
         var children = flow.find('.children');
         $.each(branch.children, function() {
            children.append(THIS._renderBranch(this));
         });
         return flow;
      },


// TOOL BAR /////////////////////////////////////////////////////////////
      _renderTools: function () {
         var THIS = this;
         var buf = $(this.config.elements.buf);
         var tools = THIS.templates.tools.tmpl({categories: THIS.categories});

         tools.find('.category').click(function () {
            $(this).toggleClass('voicemail_apps');
            $(this).children().toggleClass('open');
            var current = $(this);
            while(current.next().hasClass('tool') ||
                  current.next().hasClass('app_list_nav') ||
                  current.next().hasClass('clear')) {
               current = current.next();
               current.toggle();
            }
         });

//         tools.find('.category').click();

         tools.find('.tool').hover(function () {$(this).addClass('active');}, function () {$(this).removeClass('active');})

         function action (el) {
            el.draggable({
               start: function () {
                  THIS._enableDestinations($(this));

                  var clone = $(this).clone();
                  action(clone);
                  clone.addClass('inactive');
                  clone.insertBefore($(this));

                  $(this).addClass('active');
               },
               drag: function () {
               },
               stop: function () {
                  THIS._disableDestinations();
                  $(this).prev().removeClass('inactive');
                  $(this).remove();
               }
            });
         }

         tools.find('.action').each(function () { action($(this)); });

         return tools;
      },

// DESTINATION POINTS ///////////////////////////////////////
      _enableDestinations: function (el) {
         var THIS = this;

         $('.node').each(function () {
            var activate = true;
            var target = THIS.flow.nodes[$(this).attr('id')];
            if (el.attr('name') in target.potentialChildren()) {
               if (el.hasClass('node') && THIS.flow.nodes[el.attr('id')].contains(target)) {
                  activate = false;
               }
            }
            else activate = false;
            if (activate) $(this).addClass('active');
            else {
               $(this).addClass('inactive');
               $(this).droppable('disable');
            }
         });
      },

      _disableDestinations: function () {
         $('.node').each(function () {
            $(this).removeClass('active');
            $(this).removeClass('inactive');
            $(this).droppable('enable');
         });
         $('.tool').removeClass('active');
      },

      save: function () {
         var THIS = this;

         if(THIS.flow.id) {
            winkstart.postJSON('callflow.update', {
                    account_id: MASTER_ACCOUNT_ID,
                    callflow_id: THIS.flow.id,
                    data: {
                        numbers: THIS.flow.numbers,
                        flow: (THIS.flow.root.children['0'] == undefined) ? {} : THIS.flow.root.children['0'].serialize()
                    }
                }, function(json) {
                    THIS.renderList();
                    THIS.editCallflow({id: json.data.id});
                }
            );
         }
         else {
            winkstart.putJSON('callflow.create', {
                    account_id: MASTER_ACCOUNT_ID,
                    data: {
                        numbers: THIS.flow.numbers,
                        flow: (THIS.flow.root.children['0'] == undefined) ? {} : THIS.flow.root.children['0'].serialize()
                    }
                }, function(json) {
                    THIS.renderList();
                    THIS.editCallflow({id: json.data.id});
                }
            );
         }
      },

/*****************************************************************************
 *  Deep object cloning  ***
 *****************************************************************************/
      _clone: function (obj) {
         if (obj == null || typeof(obj) != 'object') return obj;
         var o = new obj.constructor(); 
         for (var key in obj) o[key] = this._clone(obj[key]);
         return o;
      }, 

   //Regular WS JS here:
    renderList: function(callback){
        var THIS = this;

        winkstart.getJSON('callflow.list', {
            crossbar: true,
            account_id: MASTER_ACCOUNT_ID
        }, function (json, xhr) {

            // List Data that would be sent back from server
            function map_crossbar_data(crossbar_data){
                var new_list = [];
                if(crossbar_data.length > 0) {
                    _.each(crossbar_data, function(elem){
                        new_list.push({
                            id: elem.id,
                            title: elem.numbers.toString()
                        });
                    });
                }
                return new_list;
            }

            var options = {};
            options.label = 'Callflow Module';
            options.identifier = 'callflow-module-listview';
            options.new_entity_label = 'Callflow';
            options.data = map_crossbar_data(json.data);
            options.publisher = winkstart.publish;
            options.notifyMethod = 'callflow.list-panel-click';
            options.notifyCreateMethod = 'callflow.edit-callflow';  /* Edit with no ID = Create */

            $("#callflow-listpanel").empty();
            $("#callflow-listpanel").listpanel(options);
        
            if(typeof callback == 'function') {
                callback();
            }

        });
    }
});
