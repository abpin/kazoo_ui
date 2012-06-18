winkstart.module('pbxs', 'pbxs_manager', {
        css: [
            'css/pbxs_manager.css',
            'css/numbers_popup.css',
            'css/endpoints.css'
        ],

        templates: {
            pbxs_manager: 'tmpl/pbxs_manager.html',
            failover_dialog: 'tmpl/failover_dialog.html',
            cnam_dialog: 'tmpl/cnam_dialog.html',
            e911_dialog: 'tmpl/e911_dialog.html',
            add_number_dialog: 'tmpl/add_number_dialog.html',
            add_number_search_results: 'tmpl/add_number_search_results.html',
            port_dialog: 'tmpl/port_dialog.html',
            endpoint: 'tmpl/endpoint.html',
            endpoint_numbers: 'tmpl/endpoint_numbers.html'
        },

        subscribe: {
            'pbxs_manager.activate' : 'activate',
            'pbxs_manager.edit' : 'edit_server'
        },

        resources: {
            'pbxs_manager.list': {
                url: '{api_url}/accounts/{account_id}/phone_numbers',
                contentType: 'application/json',
                verb: 'GET'
            },
            'pbxs_manager.get': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'pbxs_manager.update': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}',
                contentType: 'application/json',
                verb: 'POST'
            },
            'pbxs_manager.activate': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}/activate',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'pbxs_manager.search': {
                url: '{api_url}/phone_numbers?prefix={prefix}&quantity={quantity}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'pbxs_manager.delete': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}',
                contentType: 'application/json',
                verb: 'DELETE'
            },
            'pbxs_manager.port': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}/port',
                contentType: 'application/json',
                verb: 'PUT'
            },
            'pbxs_manager.create': {
                url: '{api_url}/accounts/{account_id}/phone_numbers/{phone_number}/docs/{file_name}',
                contentType: 'application/x-base64',
                verb: 'PUT'
            },
            'old_trunkstore.list': {
                url: '{api_url}/accounts/{account_id}/connectivity',
                contentType: 'application/json',
                verb: 'GET'
            },
            'old_trunkstore.get': {
                url: '{api_url}/accounts/{account_id}/connectivity/{connectivity_id}',
                contentType: 'application/json',
                verb: 'GET'
            },
            'old_trunkstore.update': {
                url: '{api_url}/accounts/{account_id}/connectivity/{connectivity_id}',
                contentType: 'application/json',
                verb: 'POST'
            }
        }
    },

    function(args) {
        var THIS = this;

        winkstart.registerResources(THIS.__whapp, THIS.config.resources);
    },

    {
        list_accounts: function(success, error) {
            winkstart.request('old_trunkstore.list', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        success(data, status);
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        get_account: function(success, error) {
            var THIS = this;

            winkstart.request('old_trunkstore.get', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    connectivity_id: winkstart.apps['pbxs'].connectivity_id
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        success(data, status);
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        list_servers: function(success, error) {
            var THIS = this,
                get_account = function() {
                    THIS.get_account(
                        function(_data, status) {
                            success(_data.data.servers, status);
                        }
                    );
                };

            THIS.list_accounts(function(data, status) {
                if(data.data.length) {
                    winkstart.apps['pbxs'].connectivity_id = data.data[0];

                    get_account();
                }
                else {
                    winkstart.alert('There is currently no trunkstore account setup for this account.');
                }
            });
        },

        edit_server: function(data, _parent, _target, _callbacks, data_defaults) {
            var THIS = this,
                parent = _parent || $('#pbxs_manager-content'),
                target = _target || $('#pbxs_manager-view', parent),
                _callbacks = _callbacks || {},
                callbacks = {
                    save_success: _callbacks.save_success || function(_data) {
                        THIS.render_list(parent);

                        //todo index
                        THIS.edit_server({ id: data.id || _data.data.servers.length-1 }, parent, target, callbacks);
                    },

                    save_error: _callbacks.save_error,

                    delete_success: _callbacks.delete_success || function() {
                        target.empty();

                        THIS.render_list(parent);
                    },

                    delete_error: _callbacks.delete_error,

                    after_render: _callbacks.after_render
                };

            THIS.get_account(function(_data, status) {
                var defaults = $.extend(true, {
                        auth: {},
                        options: {
                            e911_info: {}
                        },
                        extra: {
                            realm: _data.data.account.auth_realm,
                            id: data.id || 'new'
                        }
                    }, data_defaults || {});

                if(typeof data === 'object' && (data.id || data.id === 0)) {
                    //THIS.render_endpoint(_data, $.extend(true, defaults, _data.data.servers[data.id]), target, callbacks);
                    THIS.render_pbxs_manager(_data, $.extend(true, defaults, _data.data.servers[data.id]), target, callbacks);
                }
                else {
                    THIS.render_endpoint(_data, defaults, target, callbacks);
                }
            });
        },

        get_number: function(phone_number, success, error) {
            winkstart.request('pbxs_manager.get', {
                    api_url: winkstart.apps['pbxs'].api_url,
                    account_id: winkstart.apps['pbxs'].account_id,
                    phone_number: encodeURIComponent(phone_number)
                },
                function(_data, status) {
                    if(typeof success === 'function') {
                        success(_data);
                    }
                },
                function(_data, status) {
                    if(typeof error === 'function') {
                        error(_data);
                    }
                }
            );
        },

        update_number: function(phone_number, data, success, error) {
            winkstart.request('pbxs_manager.update', {
                    api_url: winkstart.apps['pbxs'].api_url,
                    account_id: winkstart.apps['pbxs'].account_id,
                    phone_number: encodeURIComponent(phone_number),
                    data: data
                },
                function(_data, status) {
                    if(typeof success === 'function') {
                        success(_data);
                    }
                },
                function(_data, status) {
                    if(typeof error === 'function') {
                        error(_data);
                    }
                }
            );
        },

        port_number: function(data, success, error) {
            var THIS = this;

            winkstart.request('pbxs_manager.port', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    phone_number: encodeURIComponent(data.phone_number),
                    data: data.options || {}
                },
                function(_data, status) {
                    if(typeof success == 'function') {
                        success(_data, status);
                    }
                },
                function(_data, status) {
                    if(typeof error == 'function') {
                        error(_data, status);
                    }
                }
            );
        },

        activate_number: function(phone_number, success, error) {
            var THIS = this;

            winkstart.request(false, 'pbxs_manager.activate', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    phone_number: encodeURIComponent(phone_number),
                    data: {}
                },
                function(_data, status) {
                    if(typeof success == 'function') {
                        success(_data, status);
                    }
                },
                function(_data, status) {
                    if(typeof error == 'function') {
                        error(_data, status);
                    }
                }
            );
        },

        delete_number: function(phone_number, success, error) {
            var THIS = this;

            winkstart.request('pbxs_manager.delete', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    phone_number: encodeURIComponent(phone_number)
                },
                function(data, status) {
                    if(typeof success == 'function') {
                        success(data, status);
                    }
                },
                function(data, status) {
                    if(typeof error == 'function') {
                        error(data, status);
                    }
                }
            );
        },

        search_numbers: function(data, success, error) {
            var THIS = this;

            winkstart.request('pbxs_manager.search', {
                    api_url: winkstart.apps['pbxs'].api_url,
                    prefix: data.prefix,
                    quantity: data.quantity || 15
                },
                function(_data, status) {
                    if(typeof success == 'function') {
                        success(_data, status);
                    }
                },
                function(_data, status) {
                    if(typeof error == 'function') {
                        error(_data, status);
                    }
                }
            );
        },

        create_number_doc: function(data, success, error) {
            var THIS = this;

            winkstart.request('pbxs_manager.create', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    phone_number: encodeURIComponent(data.phone_number),
                    file_name: data.file_name,
                    data: data.file_data
                },
                function(_data, status) {
                    if(typeof success == 'function') {
                        success(_data, status);
                    }
                },
                function(_data, status) {
                    if(typeof error == 'function') {
                        error(_data, status);
                    }
                }
            );
        },

        submit_port: function(port_data, number_data, callback) {
            var THIS = this,
                uploads_done = 0,
                put_port_data = function() {
                    number_data.options.port = port_data.port;

                    //todo phone nbr/data/cb
                    THIS.update_number(number_data.phone_number, number_data.options, function(data) {
                        if(typeof callback == 'function') {
                            callback(data);
                        }
                    });
                },
                put_port_doc = function(index) {
                    /* Add files */
                    THIS.create_number_doc({
                            phone_number: number_data.phone_number,
                            file_name: port_data.loa[0].file_name,
                            file_data: port_data.loa[0].file_data
                        },
                        function(_data, status) {
                            THIS.create_number_doc({
                                    phone_number: number_data.phone_number,
                                    file_name: port_data.files[index].file_name,
                                    file_data: port_data.files[index].file_data
                                },
                                function(_data, status) {
                                    put_port_data();
                                }
                            );
                        }
                    );
                };

            if(port_data.port.main_number === number_data.phone_number) {
                put_port_doc(0);
            }
            else{
                put_port_data();
            }
        },

        add_numbers: function(numbers_data, callback) {
            var THIS = this,
                number_data;

            if(numbers_data.length > 0) {
                var phone_number = numbers_data[0].phone_number.match(/^\+?1?([2-9]\d{9})$/),
                    error_function = function() {
                        winkstart.confirm('There was an error when trying to acquire ' + numbers_data[0].phone_number +
                            ', would you like to retry?',
                            function() {
                                THIS.add_numbers(numbers_data, callback);
                            },
                            function() {
                                THIS.add_numbers(numbers_data.slice(1), callback);
                            }
                        );
                    };

                if(phone_number[1]) {
                    THIS.activate_number(phone_number[1],
                        function(_data, status) {
                            THIS.add_numbers(numbers_data.slice(1), callback);
                        },
                        function(_data, status) {
                            error_function();
                        }
                    );
                }
                else {
                    error_function();
                }
            }
            else {
                if(typeof callback === 'function') {
                    callback();
                }
            }
        },

        clean_phone_number_data: function(data) {
            /* Clean Failover */
            if('failover' in data && 'sip' in data.failover && data.failover.sip === '') {
                delete data.failover.sip;
            }

            if('failover' in data && 'e164' in data.failover && data.failover.e164 === '') {
                delete data.failover.e164;
            }

            if(data.failover && $.isEmptyObject(data.failover)) {
                delete data.failover;
            }

            /* Clean Caller-ID */
            if('cnam' in data && 'display_name' in data.cnam && data.cnam.display_name === '') {
                delete data.cnam.display_name;
            }

            if(data.cnam && $.isEmptyObject(data.cnam)) {
                delete data.cnam;
            }

            /* Clean e911 */
        },

        normalize_endpoint_data: function(data) {
            delete data.serverid;
            delete data.extra;

            return data;
        },

        save_endpoint: function(endpoint_data, data, success, error) {
            var THIS = this,
                index = endpoint_data.extra.serverid,
                new_data = $.extend(true, {}, data.data);

            THIS.normalize_endpoint_data(endpoint_data);
            if((index || index === 0) && index != 'new') {
                $.extend(true, new_data.servers[index], endpoint_data);
            }
            else {
                new_data.servers.push($.extend(true, {
                    DIDs: {},
                    options: {
                        enabled: true,
                        inbound_format: 'e.164',
                        international: false,
                        caller_id: {},
                        e911_info: {},
                        failover: {}
                    },
                    permissions: {
                        users: []
                    },
                    monitor: {
                        monitor_enabled: false
                    }
                }, endpoint_data));
            }

            winkstart.request('old_trunkstore.update', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url,
                    connectivity_id: winkstart.apps['pbxs'].connectivity_id,
                    data: new_data
                },
                function(_data, status) {
                    if(typeof success == 'function') {
                        success(_data, status);
                    }
                },
                function(_data, status) {
                    if(typeof error == 'function') {
                        error(_data, status);
                    }
                }
            );
        },

        popup_endpoint_settings: function(data, endpoint_data, callbacks) {
            var THIS = this,
                popup = winkstart.dialog($('<div class="inline_popup"><div class="inline_content main_content"/></div>'), {
                    title: 'Edit Settings of '+endpoint_data.server_name,
                    position: ['center', 100]
                });

            THIS.render_endpoint(data, endpoint_data, $('.main_content', popup), {
                save_success: function(_data) {
                    popup.dialog('close');

                    if(callbacks && typeof callbacks.save_success == 'function') {
                        callbacks.save_success(_data);
                    }
                },
                delete_success: function() {
                    popup.dialog('close');

                    if(typeof callback == 'function') {
                        callback({ data: {} });
                    }
                }
            });
        },

        render_endpoint: function(data, endpoint_data, target, callbacks) {
            var THIS = this,
                endpoint_html = THIS.templates.endpoint.tmpl(endpoint_data);

            $.each($('.pbxs .pbx', endpoint_html), function() {
                if($(this).dataset('pbx_name') === endpoint_data.server_type) {
                    $(this).addClass('selected');
                    $('.pbxs .pbx:not(.selected)', endpoint_html).css('opacity', '0.5');
                    return false;
                }
            });

            if(endpoint_data.server_type && $('.pbxs .pbx.selected', endpoint_html).size() === 0) {
                $('.pbxs .pbx.other', endpoint_html).addClass('selected');
            }

            if(!endpoint_data.server_type) {
                $('.info_pbx', endpoint_html).hide();
            }

            $('.endpoint.edit', endpoint_html).click(function(ev) {
                ev.preventDefault();
                var form_data = form2object('endpoint');
                form_data.server_type = $('.pbxs .selected', endpoint_html).dataset('pbx_name');
                if(form_data.server_type === 'other') {
                    form_data.server_type = $('#other_name', endpoint_html).val();
                }

                THIS.save_endpoint(form_data, data, function(_data) {
                    if(typeof callbacks.save_success == 'function') {
                        callbacks.save_success(_data);
                    }
                });
            });

            $('.endpoint.delete', endpoint_html).click(function(ev) {
                ev.preventDefault();

                /*THIS.delete_endpoint(id, data, function(_data) {
                    if(typeof callbacks.delete_success == 'function') {
                        callbacks.delete_success(_data);
                    }
                });*/
            });

            $('.pbxs .pbx', endpoint_html).click(function() {
                $('.info_pbx', endpoint_html).show();
                $('.pbxs .pbx', endpoint_html).removeClass('selected').css('opacity', '0.5');
                $(this).addClass('selected');

                $('.selected_pbx_block', endpoint_html).slideDown('fast');
                $('.selected_pbx', endpoint_html).html($('.pbxs .selected', endpoint_html).dataset('pbx_name'));

                if($(this).hasClass('other')) {
                    $('.selected_pbx_block', endpoint_html).hide();
                    $('.other_name_wrapper', endpoint_html).slideDown();
                    $('#other_name', endpoint_html).focus();
                }
                else {
                    $('.other_name_wrapper', endpoint_html).hide();
                    $('.selected_pbx_block', endpoint_html).slideDown();
                    $('input[name="auth.auth_user"]', endpoint_html).focus();
                }
            });

            (target).empty()
                    .append(endpoint_html);

            /* Hack to display the selected PBX first in the list
               Or if new, scroll to the first pbx */
            var a = $('.pbxs', endpoint_html).offset().left,
                b = endpoint_data.server_type ? $('.pbxs .'+endpoint_data.server_type.replace('.', '').toLowerCase(), endpoint_html).offset().left : a;

            $('.pbxs').animate({ scrollLeft: b-a }, 0);

        },

        render_pbxs_manager: function(data, endpoint_data, target, callbacks) {
            var THIS = this,
                pbxs_manager_html = THIS.templates.endpoint_numbers.tmpl(endpoint_data);

            THIS.setup_table(pbxs_manager_html);

            $('.detail_pbx', pbxs_manager_html).click(function() {
                THIS.popup_endpoint_settings(data, endpoint_data, callbacks);
            });

            $(pbxs_manager_html).delegate('#add_number', 'click', function() {
                THIS.render_add_number_dialog(function() {
                    THIS.list_numbers();
                });
            });

            $(pbxs_manager_html).delegate('.failover', 'click', function() {
                var $failover_cell = $(this),
                    data_phone_number = $failover_cell.parents('tr').first().attr('id'),
                    phone_number = data_phone_number.match(/^\+?1?([2-9]\d{9})$/);

                if(phone_number[1]) {
                    THIS.get_number(phone_number[1], function(_data) {
                        THIS.render_failover_dialog(_data.data.failover || {}, function(failover_data) {
                            _data.data.failover = $.extend({}, _data.data.failover, failover_data);

                            THIS.clean_phone_number_data(_data.data);

                            THIS.update_number(phone_number[1], _data.data, function(_data_update) {
                                !($.isEmptyObject(_data.data.failover)) ? $failover_cell.removeClass('inactive').addClass('active') : $failover_cell.removeClass('active').addClass('inactive');
                            });
                        });
                    });
                }
            });

            $(pbxs_manager_html).delegate('.cid', 'click', function() {
                var $cnam_cell = $(this),
                    data_phone_number = $cnam_cell.parents('tr').first().attr('id'),
                    phone_number = data_phone_number.match(/^\+?1?([2-9]\d{9})$/);

                if(phone_number[1]) {
                    THIS.get_number(phone_number[1], function(_data) {
                        THIS.render_cnam_dialog(_data.data.cnam || {}, function(cnam_data) {
                            _data.data.cnam = $.extend({}, _data.data.cnam, cnam_data);

                            THIS.clean_phone_number_data(_data.data);

                            THIS.update_number(phone_number[1], _data.data, function(_data_update) {
                                !($.isEmptyObject(_data.data.cnam)) ? $cnam_cell.removeClass('inactive').addClass('active') : $cnam_cell.removeClass('active').addClass('inactive');
                            });
                        });
                    });
                }
            });

            $(pbxs_manager_html).delegate('.e911', 'click', function() {
                var $e911_cell = $(this),
                    data_phone_number = $e911_cell.parents('tr').first().attr('id'),
                    phone_number = data_phone_number.match(/^\+?1?([2-9]\d{9})$/);

                if(phone_number[1]) {
                    THIS.get_number(phone_number[1], function(_data) {
                        THIS.render_e911_dialog(_data.data.dash_e911 || {}, function(e911_data) {
                            _data.data.dash_e911 = $.extend({}, _data.data.dash_e911, e911_data);

                            THIS.clean_phone_number_data(_data.data);

                            THIS.update_number(phone_number[1], _data.data, function(_data_update) {
                                !($.isEmptyObject(_data.data.dash_e911)) ? $e911_cell.removeClass('inactive').addClass('active') : $e911_cell.removeClass('active').addClass('inactive');
                            });
                        });
                    });
                }
            });

            $(pbxs_manager_html).delegate('#delete_number', 'click', function() {
                var data_phone_number,
                    phone_number,
                    $selected_checkboxes = $('.select_number:checked', pbxs_manager_html),
                    nb_numbers = $selected_checkboxes.size(),
                    refresh_list = function() {
                        nb_numbers--;
                        if(nb_numbers === 0) {
                            THIS.list_numbers();
                        }
                    };

                if(nb_numbers > 0) {
                    winkstart.confirm('Are you sure you want to delete the '+nb_numbers+' number(s) selected?', function() {
                            $selected_checkboxes.each(function() {
                                data_phone_number = $(this).parents('tr').attr('id'),
                                phone_number = data_phone_number.match(/^\+?1?([2-9]\d{9})$/);

                                if(phone_number[1]) {
                                    THIS.delete_number(phone_number[1],
                                        function() {
                                            refresh_list();
                                        },
                                        function() {
                                            refresh_list();
                                        }
                                    );
                                }
                            });
                        },
                        function() {

                        }
                    );
                }
                else {
                    winkstart.alert('You didn\'t select any number to delete');
                }
            });

            $(pbxs_manager_html).delegate('#port_numbers', 'click', function(ev) {
                ev.preventDefault();

                THIS.render_port_dialog(function(port_data, popup) {
                    var ports_done = 0;

                    $.each(port_data.phone_numbers, function(i, val) {
                        var number_data = {
                            phone_number: val
                        };

                        THIS.port_number(number_data, function(_number_data) {
                            number_data.options = _number_data.data;

                            if('id' in number_data.options) {
                                delete number_data.options.id;
                            }

                            THIS.submit_port(port_data, number_data, function(_data) {
                                if(++ports_done > port_data.phone_numbers.length - 1) {
                                    THIS.list_numbers();

                                    popup.dialog('close');
                                }
                            });
                        });
                    });
                });
            });

            THIS.list_numbers(function() {
                (target || $('#pbxs_manager-content'))
                    .empty()
                    .append(pbxs_manager_html);
            });
        },

        render_cnam_dialog: function(cnam_data, callback) {
            var THIS = this,
                popup_html = THIS.templates.cnam_dialog.tmpl(cnam_data || {}),
                popup;

            $('.submit_btn', popup_html).click(function(ev) {
                ev.preventDefault();

                var cnam_form_data = form2object('cnam');

                if(typeof callback === 'function') {
                    callback(cnam_form_data);
                }

                popup.dialog('close');
            });

            popup = winkstart.dialog(popup_html, {
                title: 'Edit CID'
            });
        },

        render_failover_dialog: function(failover_data, callback) {
            var THIS = this,
                tmpl_data = {
                    radio: (failover_data || {}).e164 ? 'number' : ((failover_data || {}).sip ? 'sip' : ''),
                    failover: (failover_data || {}).e164 || (failover_data || {}).sip || '',
                    phone_number: failover_data.phone_number || ''
                },
                popup_html = THIS.templates.failover_dialog.tmpl(tmpl_data),
                popup,
                result,
                popup_title = failover_data.phone_number ? 'Setup Failover for ' + failover_data.phone_number : 'Setup Failover';

            $('.radio_block input[type="radio"]', popup_html).click(function() {
                $('.radio_block input[type="text"]', popup_html).hide();

                $(this).siblings('input[type="text"]').show('fast');

                $('.header', popup_html).removeClass('number sip').addClass($('.radio_block input[type="radio"]:checked', popup_html).val());
            });

            $('.submit_btn', popup_html).click(function(ev) {
                ev.preventDefault();

                var failover_form_data = {};

                failover_form_data.raw_input = $('input[name="failover_type"]:checked', popup_html).val() === 'number' ? $('.failover_number', popup_html).val() : $('.failover_sip', popup_html).val();

                if(failover_form_data.raw_input.match(/^sip:/)) {
                    failover_form_data.sip = failover_form_data.raw_input;
                }
                else if(result = failover_form_data.raw_input.replace(/-|\(|\)|\s/g,'').match(/^\+?1?([2-9]\d{9})$/)) {
                    failover_form_data.e164 = '+1' + result[1];
                }
                else {
                    failover_form_data.e164 = '';
                }

                delete failover_form_data.raw_input;

                if(failover_form_data.e164 || failover_form_data.sip) {
                    if(typeof callback === 'function') {
                        callback(failover_form_data);
                    }

                    popup.dialog('close');
                }
                else {
                    winkstart.alert('Invalid Failover Number, please type it again.');
                }
            });

            $('.remove_failover', popup_html).click(function(ev) {
                ev.preventDefault();
                if(typeof callback === 'function') {
                    callback({ e164: '', sip: '' });
                }

                popup.dialog('close');
            });

            popup = winkstart.dialog(popup_html, {
                title: popup_title,
                width: '640px'
            });
        },

        render_e911_dialog: function(e911_data, callback) {
            var THIS = this,
                popup_html = THIS.templates.e911_dialog.tmpl(e911_data || {}),
                popup;

            $('#postal_code', popup_html).blur(function() {
                $.getJSON('http://www.geonames.org/postalCodeLookupJSON?&country=US&callback=?', { postalcode: $(this).val() }, function(response) {
                    if (response && response.postalcodes.length && response.postalcodes[0].placeName) {
                        $('#locality', popup_html).val(response.postalcodes[0].placeName);
                        $('#region', popup_html).val(response.postalcodes[0].adminName1);
                    }
                });
            });

            $('.submit_btn', popup_html).click(function(ev) {
                ev.preventDefault();

                var e911_form_data = form2object('e911');

                if(typeof callback === 'function') {
                    callback(e911_form_data);
                }

                popup.dialog('close');
            });

            popup = winkstart.dialog(popup_html, {
                title: e911_data.phone_number ? 'Edit Location for ' + e911_data.phone_number : 'Edit 911 Location',
                width: '465px'
            });
        },

        render_add_number_dialog: function(callback) {
            var THIS = this,
                numbers_data = [],
                popup_html = THIS.templates.add_number_dialog.tmpl(),
                popup;

            $('.toggle_div', popup_html).hide();

            $('#search_numbers_button', popup_html).click(function(ev) {
                $('.toggle_div', popup_html).hide();

                var npa_data = {},
                    npa = $('#sdid_npa', popup_html).val(),
                    nxx = $('#sdid_nxx', popup_html).val();

                ev.preventDefault();

                npa_data.prefix = npa + nxx;

                THIS.search_numbers(npa_data, function(results_data) {
                    var results_html = THIS.templates.add_number_search_results.tmpl(results_data);

                    $('#foundDIDList', popup_html)
                        .empty()
                        .append(results_html);

                    $('.toggle_div', popup_html).show();
                });
            });

            $('#add_numbers_button', popup_html).click(function(ev) {
                ev.preventDefault();

                $('#foundDIDList .checkbox_number:checked', popup_html).each(function() {
                    numbers_data.push($(this).dataset());
                });


                THIS.add_numbers(numbers_data, function() {
                    if(typeof callback === 'function') {
                        callback();
                    }

                    popup.dialog('close');
                });
            });

            $(popup_html).delegate('.checkbox_number', 'click', function() {
                var selected_numbers =  $('.checkbox_number:checked', popup_html).size(),
                    sum_price = 0;

                $.each($('.checkbox_number:checked', popup_html), function() {
                    sum_price += parseFloat($(this).dataset('price'));
                });

                sum_price = '$'+sum_price+'.00';

                $('.selected_numbers', popup_html).html(selected_numbers);
                $('.cost_numbers', popup_html).html(sum_price);
            });

            popup = winkstart.dialog(popup_html, {
                title: 'Add number',
                width: '600px',
                position: ['center', 20]
            });
        },

        render_port_dialog: function(callback) {
            var THIS = this,
                port_form_data = {},
                popup_html = THIS.templates.port_dialog.tmpl({
                    support_file_upload: (File && FileReader)
                }),
                popup,
                files,
                loa,
                phone_numbers,
                current_step = 1,
                max_steps = 4,
                $prev_step = $('.prev_step', popup_html),
                $next_step = $('.next_step', popup_html),
                $submit_btn = $('.submit_btn', popup_html);

            $('.step_div:not(.first)', popup_html).hide();
            $prev_step.hide();
            $submit_btn.hide();

            $('.other_carrier', popup_html).hide();

            $('.carrier_dropdown', popup_html).change(function() {
                if($(this).val() === 'Other') {
                    $('.other_carrier', popup_html).show();
                }
                else {
                    $('.other_carrier', popup_html).empty().hide();
                }
            });

            $('#postal_code', popup_html).blur(function() {
                $.getJSON('http://www.geonames.org/postalCodeLookupJSON?&country=US&callback=?', { postalcode: $(this).val() }, function(response) {
                    if (response && response.postalcodes.length && response.postalcodes[0].placeName) {
                        $('#locality', popup_html).val(response.postalcodes[0].placeName);
                        $('#region', popup_html).val(response.postalcodes[0].adminName1);
                    }
                });
            });

            $('.prev_step', popup_html).click(function() {
                $next_step.show();
                $submit_btn.hide();
                $('.step_div', popup_html).hide();
                $('.step_div:nth-child(' + --current_step + ')', popup_html).show();
                $('.wizard_nav .steps_text li, .wizard_nav .steps_image .round_circle').removeClass('current');
                $('#step_title_'+current_step +', .wizard_nav .steps_image .round_circle:nth-child('+ current_step +')', popup_html).addClass('current');

                current_step === 1 ? $('.prev_step', popup_html).hide() : true;
            });

            $('.next_step', popup_html).click(function() {
                $prev_step.show();
                $('.step_div', popup_html).hide();
                $('.step_div:nth-child(' + ++current_step + ')', popup_html).show();
                $('.wizard_nav .steps_text li, .wizard_nav .steps_image .round_circle').removeClass('current');
                $('#step_title_'+current_step +', .wizard_nav .steps_image .round_circle:nth-child('+ current_step +')', popup_html).addClass('current');
                if(current_step === max_steps) {
                    $next_step.hide();
                    $submit_btn.show();
                }
            });

            $('.loa', popup_html).change(function(ev) {
                var slice = [].slice,
                    raw_files = slice.call(ev.target.files, 0),
                    file_reader = new FileReader(),
                    file_name,
                    read_file = function(file) {
                        file_name = file.fileName || file.name || 'noname';
                        file_reader.readAsDataURL(file);
                    };

                loa = [];

                file_reader.onload = function(ev) {
                    loa.push({
                        file_name: file_name,
                        file_data: ev.target.result
                    });

                    if(raw_files.length > 1) {
                        raw_files = raw_files.slice(1);
                        read_file(raw_files[0]);
                    }
                };

                read_file(raw_files[0]);
            });

            $('.files', popup_html).change(function(ev) {
                var slice = [].slice,
                    raw_files = slice.call(ev.target.files, 0),
                    file_reader = new FileReader(),
                    file_name,
                    read_file = function(file) {
                        file_name = file.fileName || file.name || 'noname';
                        file_reader.readAsDataURL(file);
                    };

                files = [];

                file_reader.onload = function(ev) {
                    files.push({
                        file_name: file_name,
                        file_data: ev.target.result
                    });

                    if(raw_files.length > 1) {
                        raw_files = raw_files.slice(1);
                        read_file(raw_files[0]);
                    }
                    else {
                        $('.number_of_docs', popup_html).html(files.length);
                    }
                };

                read_file(raw_files[0]);
            });

            $('.submit_btn', popup_html).click(function(ev) {
                ev.preventDefault();
                port_form_data = form2object('port');

                var string_alert = '';

                if($('.carrier_dropdown', popup_html).val() === 'Other') {
                    port_form_data.port.service_provider = $('.other_carrier', popup_html).val();
                }

                if(!port_form_data.extra.agreed) {
                    string_alert += 'You must agree to the terms before continuing!<br/>';
                }

                $.each(port_form_data.extra.cb, function(k, v) {
                    if(v === false) {
                        string_alert += 'You must confirm the first conditions before continuing!<br/>';
                        return false;
                    }
                });

                port_form_data.phone_numbers = $('.numbers_text', popup_html).val().replace(/\n/g,',');
                port_form_data.phone_numbers = port_form_data.phone_numbers.replace(/[\s-\(\)\.]/g, '').split(',');

                port_form_data.port.main_number = port_form_data.port.main_number.replace(/[\s-\(\)\.]/g, '');

                var res = port_form_data.port.main_number.match(/^\+?1?([2-9]\d{9})$/);
                res ? port_form_data.port.main_number = '+1' + res[1] : string_alert += 'You need to enter a main number.<br/>';

                port_form_data.phone_numbers.push(port_form_data.port.main_number);

                phone_numbers = [];
                $.each(port_form_data.phone_numbers, function(i, val) {
                    var result = val.match(/^\+?1?([2-9]\d{9})$/);

                    if(result) {
                        phone_numbers.push('+1' + result[1]);
                    }
                    else {
                        if(val !== '') {
                            string_alert += val + ' : this Phone Number is not valid.<br/>';
                        }
                    }
                });
                port_form_data.phone_numbers = phone_numbers;

                port_form_data.files = files;
                port_form_data.loa = loa;

                if(string_alert === '') {
                    delete port_form_data.extra;

                    if(typeof callback === 'function') {
                        callback(port_form_data, popup);
                    }
                }
                else {
                    winkstart.alert(string_alert);
                }
            });

            popup = winkstart.dialog(popup_html, {
                title: 'Port a number'
            });
        },

        render_list: function(parent) {
            var THIS = this,
                parent = parent || $('#ws-content');

            THIS.list_servers(function(data, status) {
                var map_crossbar_data = function(data) {
                    var new_list = [];

                    if(data.length > 0) {
                        var i = 0;
                        $.each(data, function(key, val) {
                            new_list.push({
                                id: i,
                                title: val.server_name || '(no name)'
                            });
                            i++;
                        });
                    }

                    new_list.sort(function(a, b) {
                        return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
                    });

                    return new_list;
                };

                $('#pbxs_manager-listpanel', parent)
                    .empty()
                    .listpanel({
                        label: 'PBXs',
                        identifier: 'pbxs_manager-listview',
                        new_entity_label: 'Add Server',
                        data: map_crossbar_data(data),
                        publisher: winkstart.publish,
                        notifyMethod: 'pbxs_manager.edit',
                        notifyCreateMethod: 'pbxs_manager.edit',
                        notifyParent: parent
                    });

                $.each(data, function(k, v) {
                    var img_link = v.server_type  ? v.server_type.replace('.','').toLowerCase() : 'other';

                    $('#' + k, $('#pbxs_manager-listpanel', parent)).prepend('<span><img class="img_style" src="whapps/pbxs/pbxs_manager/css/images/endpoints/'+ img_link +'.png" height="44" width=62"/></span>');
                });
            });
        },

        activate: function(parent) {
            var THIS = this,
                pbxs_manager_html = THIS.templates.pbxs_manager.tmpl();

            (parent || $('#ws-content'))
                .empty()
                .append(pbxs_manager_html);

            THIS.render_list(pbxs_manager_html);
            //THIS.render_pbxs_manager();
        },

        list_numbers: function(callback) {
            winkstart.request('pbxs_manager.list', {
                    account_id: winkstart.apps['pbxs'].account_id,
                    api_url: winkstart.apps['pbxs'].api_url
                },
                function(_data, status) {
                    winkstart.table.pbxs_manager.fnClearTable();

                    var tab_data = [];
                    $.each(_data.data, function(k, v) {
                        if(k != 'id') {
                            tab_data.push(['lol', k, v.e911, v.cnam, v.failover, v.state]);
                        }
                    });

                    winkstart.table.pbxs_manager.fnAddData(tab_data);

                    if(typeof callback === 'function') {
                        callback();
                    }
                }
            );
        },

        setup_table: function(parent) {
            var THIS = this,
                pbxs_manager_html = parent,
                columns = [
                {
                    'sTitle': 'Select',
                    'fnRender': function(obj) {
                        return '<input type="checkbox" class="select_number"/>';
                    },
                    'bSortable': false
                },
                {
                    'sTitle': 'Phone Number'
                },
                {
                    'sTitle': 'Failover',
                    'fnRender': function(obj) {
                        var failover = 'failover ' + (obj.aData[obj.iDataColumn] ? 'active' : 'inactive');
                        return '<a class="'+ failover  +'">Failover</a>';
                    },
                    'bSortable': false
                },
                {
                    'sTitle': 'Caller-ID',
                    'fnRender': function(obj) {
                        var cid = 'cid ' + (obj.aData[obj.iDataColumn] ? 'active' : 'inactive');
                        return '<a class="'+ cid  +'">CID</a>';
                    },
                    'bSortable': false
                },
                {
                    'sTitle': 'E911',
                    'fnRender': function(obj) {
                        var e911 = 'e911 ' + (obj.aData[obj.iDataColumn] ? 'active' : 'inactive');
                        return '<a class="'+ e911  +'">E911</a>';
                    },
                    'bSortable': false
                },
                {
                    'sTitle': 'State',
                    'fnRender': function(obj) {
                        var state = obj.aData[obj.iDataColumn].replace('_',' ');
                        return state.charAt(0).toUpperCase() + state.substr(1);
                    }
                }
            ];

            winkstart.table.create('pbxs_manager', $('#pbxs_manager-grid', pbxs_manager_html), columns, {}, {
                sDom: '<"action_number">frtlip',
                aaSorting: [[1, 'desc']],
                fnRowCallback: function(nRow, aaData, iDisplayIndex) {
                    $(nRow).attr('id', aaData[1]);
                    return nRow;
                }
            });

            $('div.action_number', pbxs_manager_html).html('<button class="btn success" id="add_number">Add Number</button><button class="btn primary" id="port_numbers">Port a Number</button><button class="btn danger" id="delete_number">Delete Selected Numbers</button>');

            $('#pbxs_manager-grid_filter input[type=text]', pbxs_manager_html).first().focus();

            $('.cancel-search', pbxs_manager_html).click(function(){
                $('#pbxs_manager-grid_filter input[type=text]', pbxs_manager_html).val('');
                winkstart.table.pbxs_manager.fnFilter('');
            });
        }
    }
);