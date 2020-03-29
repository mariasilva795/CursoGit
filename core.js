/* ***********************************************************************************
 * The contents of this file are subject to the Datacrm CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  Datacrm CRM Open Source
 * The Initial Developer of the Original Code is Datacrm.
 * Portions created by Datacrm are Copyright (C) Datacrm.
 * All Rights Reserved.
 * *********************************************************************************** */

Vtiger_List_Js("ControlPanel_Core_Js", {}, {
    container: null,

    /**
     * @author Jonnattan Choque
     * @function changeServer
     * @description Función que llama la función draw y se ejecuta cada vez que se selecciona un servidor
     * @param  {} table-> instancia del datatable
     */
    changeServer: function(table){
        thisInstance = this;
        $('.changeServer').click(function(event) {
            var server_path = jQuery('#server_path').val();
            var newServer = $(this).parent('li').attr('id');
            var title = $(this).parent('li').text();
            if(newServer != server_path){
                jQuery('#getReport').html('');
                jQuery('#list_servers').find("li").removeClass('active');
                $('#example tbody').find('tr').removeClass('selected');
                jQuery('#server_path').val(newServer);
                thisInstance.draw(table,title);
                jQuery('#list_servers').find("li#"+newServer).addClass('active');
            }
        });
    },

    /**
     * @author Jonnattan Choque
     * @function getListCrms
     * @description Función que hace un ajax para consultar el listado de crms del servidor seleccionado
     * @param  {} title-> Nombre del servidor seleccionado
     * @returns json->listado crms
     */
    getListCrms: function(title = null) {
        var thisInstance = this;
        var aDeferred = jQuery.Deferred();
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'Detail',
            'mode': 'infoCrm',
            'record' : jQuery('#server_path').val(),
        };

        var statusCrmList = $('#statusCrmList').text();
        $('#example').removeClass('hidden');
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data.result.success == false){
                    app.helper.showErrorNotification({"message":"No se pudo conectar al servidor"});
                }else{
                    if(title != null){
                        jQuery('.serverTitle').html(title);
                    }
                    var dataSet = $.parseJSON(data.result);
                    if(dataSet.length == 0){
                        app.helper.showErrorNotification({"message":"No hay crms"});
                    }
                    aDeferred.resolve(dataSet);
                }
                
            }
        );
        return aDeferred.promise();
    },

    /**
     * @author Jonnattan Choque
     * @function drawListCrms
     * @description Función llama getListCrmsy dibuja el datatable
     * @param  {} title-> Nombre del servidor seleccionado
     * @returns json->listado crms
     */
    drawListCrms: function(){
        var thisInstance = this;
        var server_path = jQuery('#server_path').val();
        jQuery('#list_servers').find("li#"+server_path).addClass('active');
        thisInstance.getListCrms().then(function(dataSet){
            $.fn.dataTable.ext.errMode = 'none';
            var table = $('#example').DataTable( {
                data: dataSet,
                paging: false,
                "createdRow": function( row, data, dataIndex){
                    if( data.state ==  'Bloqueado'){
                        $(row).addClass('alert-danger');
                    }
                },
                columns: [
                    { data: "active",title: 'Seleccione todos' },
                    { data: "crm",title: 'Crm' },
                    { data: "old_version",title: 'Version' },
                    { data: "sub_version", title:'Sub version' },
                    { data: "crm_type", title:'Tipo' },
                    { data: "additional_type", title:'Tipo adicional' },
                    { data: "state", title:'Estado' },
                    { data: "view", title:'Archivos excluidos' },
                    { data: "state_date", title:'Fecha creacion' },
                    { data: "update_state", title:'Fecha modificacion' },
                    { data: "uso", title:'Uso' },
                    { data: "uso_mes", title:'Uso Mes' },
                    { data: "uso_mobile", title:'Uso Mobile' },
                    { data: "uso_mes_mobile", title:'Uso Mes Mobile' },
                    { data: "usuarios", title:'Usuarios' },
                ],
                rowReorder: true
            } );
            $('#example thead').on( 'click', 'th:first()', function () {
                console.log("asjdkasd");
                if($('#example tbody tr').hasClass('selected')){
                    console.log("asas selected");
                    $('tr').removeClass('selected');
                }else{
                    console.log("selected")
                    $('tr').addClass('selected');
                }
            } );
            $('#example tbody').on( 'click', 'tr', function () {
                $(this).toggleClass('selected');
            } );
            thisInstance.preventAction(table);
            thisInstance.callFunction(table);
            thisInstance.changeServer(table);
            thisInstance.callReport();
            thisInstance.viewInform(table);
        });
    },

    /**
     * @author Jonnattan Choque
     * @function preventAction
     * @description Función que se ejecuta al dar clic en las acciones y llama al modal confirm
     * @param  {} table-> instancia del datatable
     */
    preventAction: function(table){
        var thisInstance = this;
        $('.preventAction').click(function(event) {
            var fnstring = $(this).attr("id");//Nombre de la funcion
            var multicrm = $(this).data("multi");//saber si se puede seleccionar uno o varios crm
            var crms = table.rows('.selected').ids().toArray();//obtiene los crms seleccionados
            var count = table.rows('.selected').data().length;
            var tableData = table.rows('.selected').data();

            if (count <= 0 && multicrm != 'none' && fnstring !== 'recoveryCrm'){
                app.helper.showErrorNotification({"message":"no se selecciono ningun crm"});
            }else if(multicrm == 0 && count > 1  && fnstring !== 'recoveryCrm' && fnstring !== 'updateCrm'){
                app.helper.showErrorNotification({"message":"solo puede seleccionar un crm"});
            }else{
                var nameServer = jQuery('#nameServer').val().toLowerCase();
                if(fnstring === 'recoveryCrm' && nameServer !== 'demos.datacrm.la' && nameServer !== 'localhost.datacrm.la'){
                    app.helper.showErrorNotification({"message":"solo puedes restaurar crms de demos..."});
                    return false;
                }
                if(fnstring == 'moveCrm'){
                    var subversion = tableData[0].sub_version;
                    if (subversion < '13'){
                        app.helper.showErrorNotification({"message":"no se puede mover un crm menor a 6.3.13, debe actualizarlo primero"});
                        table.rows.removeClass('selected');
                        return false;
                    }
                }
                var view = "Confirm";
                var params = {};
                //listado de funciones a asignar
                switch (fnstring) {
                    case "createCrm":
                        title = "Crear CRM";
                    break;
                    case "updateCrm":
                        title = "Actualizar CRM " + crms;
                    break;
                    case "copyCrm":
                        title = "Copiar CRM";
                    break;
                    case "blockCrm":
                        title = "Bloquear CRM";
                    break;
                    case "unblockCrm":
                        title = "Desbloquear CRM";
                    break;
                    case "deleteCrm":
                        title = "Borrar CRM";
                    break;
                    case "backUpDb":
                        title = "Hacer BackUp BD";
                    break;
                    case "moveCrm":
                        title = "Mover CRM";
                    break;
                    case "updateAllCrms":
                        title = "Actualizar todos";
                    break;
                    case "recoveryCrm":
                        view = 'RecoveryCrms';
                        title = "Recuperar Crm";
                    break;
                    case "executeCron":
                        title = "Ejecutar Cron";
                    break;
                    case "executeGit":
                        var crmType = tableData[0].crm_type.toLowerCase();
                        var findString = crmType.search(/estandar/i);
                        if(findString !== -1){
                            app.helper.showErrorNotification({"message":"No puedes ejecutar git en crms estandar..."});
                            return false;
                        }
                        title = "Ejecutar Git";
                        view = 'PrompGit';
                    break;
                    case "executeMysql":
                        title = "Ejecutar Mysql";
                        view = 'PrompMysql';
                        break;
                }


                params['module'] = "ControlPanel";
                params['view'] = view;
                params['record'] = crms;
                params['title'] = title;
                params['funcion'] = fnstring;
                AppConnector.request(params).then(
                    function (data) {
                        jQuery('#getModal').html(data.result);
                        jQuery('#modal_confirm').modal('show');
                    }
                );
            }
        });
    },

    /**
     * @author Jonnattan Choque
     * @function callFunction
     * @description Función que se ejecuta al dar clic del modal confirm y redirecciona a determinada funcion de las acciones
     * @param  {} table-> instancia del datatable
     */
    callFunction: function(table){
        var thisInstance = this;

        $(document).on('click', '.callFunction', function(event) {
            var fnstring = $(this).data("func");
            if(fnstring == 'createCrm'){
                var crms = $('#createCrmForm').serialize(); // You need to use standard javascript object here
            }else if(fnstring == 'copyCrm'){
                var crms = $('#copyCrmForm').serialize(); // You need to use standard javascript object here
            }else if(fnstring == 'updateCrm'){
                var crms = $('#updateCrmForm').serialize(); // You need to use standard javascript object here
            }else if(fnstring == 'moveCrm'){
                var data = $('#moveCrmForm').serialize(); // You need to use standard javascript object here
                var crms = $(this).data("crms");
            }else{
                var crms = $(this).data("crms");
            }
   
            switch (fnstring) {
                case "createCrm"    : thisInstance.createCrm(table,crms); break;
                case "copyCrm"     : thisInstance.copyCrm(table,crms); break;
                case "updateCrm"     : thisInstance.updateCrm(table,crms); break;
                case "blockCrm"     : thisInstance.blockCrm(table,crms); break;
                case "unblockCrm"     : thisInstance.unblockCrm(table,crms); break;
                case "deleteCrm"     : thisInstance.deleteCrm(table,crms); break;
                case "backUpDb"     : thisInstance.backUpDb(table,crms); break;
                case "moveCrm"     : thisInstance.moveCrm(table, data, crms); break;
                case "updateAllCrms"     : thisInstance.updateAllCrms(table); break;
                case "recoveryCrm"     : thisInstance.recoveryCrm(); break;
                case "executeCron"     : thisInstance.executeCron(crms); break;
                case "executeGit"     : thisInstance.executeGit(crms); break;
                case "executeMysql"     : thisInstance.executeMysql(crms); break;
            }
        });
    },

    /**
     * @author Jonnattan Choque
     * @function blockCrm
     * @description Función que realiza un ajax para bloquear crms
     * @param  {} table-> instancia del datatable, crms-> crms a bloquear
     */
    blockCrm: function(table,crms){
        thisInstance = this;
        var params = {};

        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'blockCrm',
            'crms': crms,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data){
                    app.helper.showSuccessNotification({"message":"Crms bloqueados"});
                    var arrayCrms = crms.split(",");
                    $.each(arrayCrms, function( index, crm ) {
                        var dato = table.row("#"+crm).data();
                        dato.state = 'Bloqueado';
                        jQuery('tr#'+crm).addClass('alert-danger');
                        table.row("#"+crm).data(dato).draw();   
                    });
                } else {
                    app.helper.showErrorNotification({"message":"No se pudo bloquear"});
                }
                jQuery('#modal_confirm').modal('hide');
            }
        );
    },

    /**
     * @author Jonnattan Choque
     * @function unblockCrm
     * @description Función que realiza un ajax para desbloquear crms
     * @param  {} table-> instancia del datatable, crms-> crms a desbloquear
     */
    unblockCrm: function(table,crms){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'unblockCrm',
            'crms': crms,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data){
                    app.helper.showSuccessNotification({"message":"Crms desbloqueados"});
                    var arrayCrms = crms.split(",");
                    $.each(arrayCrms, function( index, crms ) {
                        var dato = table.row("#"+crms).data();
                        dato.state = 'Disponible';
                        jQuery('tr#'+crms).removeClass('alert-danger');
                        table.row("#"+crms).data(dato).draw();   
                    });
                } else {
                    app.helper.showErrorNotification({"message":"No se pudo desbloquear"});
                }
                jQuery('#modal_confirm').modal('hide');
            }
        );
    },

    /**
     * @author Andrés Velasquez
     * @function deleteCrm
     * @description Función que realiza un ajax para eliminar un crm
     * @param  {} table-> instancia del datatable, crms-> crm a eliminar
     */
    deleteCrm: function(table,crms){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'deleteCrm',
            'crm': crms,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data){
                    app.helper.showSuccessNotification({"message":"Crm borrado"});
                    table.row($('#'+crms)).remove().draw();
                } else {
                    app.helper.showErrorNotification({"message":"No se pudo borrar el crm"});
                }
                jQuery('#modal_confirm').modal('hide');
            }
        );
    },

    /**
     * @author Mario Rivera
     * @function backUpDb
     * @description Función que realiza un ajax para hacer un backup de la bd de un crm
     * @param  {} table-> instancia del datatable, data->formulario del mdal, crms-> crm a hacer backup db
     */
    backUpDb: function(table,crms){
        thisInstance = this;
        var params = {};
        params.module = app.getModuleName();
        params.action = 'SaveAjax';
        params.mode = 'backUpDb';
        params.crm = crms;
        params.record = jQuery('#server_path').val();

        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data['success'] && data.result.success){
                    jQuery('#modal_confirm').modal('hide');
                    app.helper.showSuccessNotification({"message":"Backup de base de datos hecho correctamente."});
                    var pathDownload = data.result.pathDownload;
                    var tbl_row = "<tr><td>" + crms + "</td>" + "<td> <a target='_blank' href='" + pathDownload + "'>" + pathDownload + "</td></tr>";
                    app.helper.hideProgress();
                    $('#infoDbPathBackUp #bodyResultPath').html(tbl_row);
                    jQuery('#infoDbPathBackUp').modal('show');
                } else {
                    app.helper.showErrorNotification({"message":"No se pudo hacer Backup de la base de datos"});
                }
            }
        );
    },

    /**
     * @author Mario Rivera
     * @function recoveryCrm
     * @description Función que recupera uno o varios crms
     */
    recoveryCrm: function(){
        var crms = jQuery('#search_crm_deleted').val();
        if(!crms || crms === ''){
            app.helper.showErrorNotification({"message":"No has escrito un nombre de crm para recuperar"});
            return false;
        }
        var params = {};
        params.module = app.getModuleName();
        params.action = 'RecoveryCrm';
        params.crms = crms;
        params.record = jQuery('#server_path').val();

        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                var result = data.result;
                jQuery.each(result, function (index, element) {
                    if(element.success === false){
                        app.helper.showErrorNotification({"message": element.result});
                    }else{
                        app.helper.showSuccessNotification({"message": element.result});
                    }
                });
                jQuery('#modal_confirm').modal('hide');
            }
        );
    },

    /**
     * @author Mario Rivera
     * @function executeCron
     * @description Función para ejecutar el cron en un crm
     */
    executeCron: function(crm){
        var params = {};
        params.module = app.getModuleName();
        params.action = 'ExecuteCron';
        params.crm = crm;
        params.record = jQuery('#server_path').val();

        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                //console.log(data); return false;
                jQuery('#modal_confirm').modal('hide');
                var message = "Cron " + crm + " ejecutado correctamente.";
                app.helper.showSuccessNotification({"message": message});
                var htmlResult = data.result.result;
                $('#infoExecuteCron #bodyResultInfoCron').html(htmlResult);
                $('#infoExecuteCron #titleInfoCrm').html('Crm ' + crm);
                app.helper.showVerticalScroll(jQuery('#infoExecuteCron .modal-body'), {'setHeight': '400px'});
                jQuery('#infoExecuteCron').modal('show');
            }
        );
    },

    /**
     * @author Mario Rivera
     * @function executeGit
     * @description Función para ejecutar acciones git en un crm
     */
    executeGit: function(crm){
        var commandValue = jQuery('#modal_confirm #command').val();
        if(!commandValue || commandValue === ''){
            app.helper.showErrorNotification({"message":"No has escrito ningún comando..."});
            return false;
        }
        var command = 'git ' + commandValue;
        var params = {};
        params.module = app.getModuleName();
        params.action = 'ExecuteGit';
        params.crm = crm;
        params.command = command;
        params.record = jQuery('#server_path').val();
        //console.log(params); return false;
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                jQuery('#command').val('');
                //console.log(data); return false;
                var message = "Commando " + command + ' ejecutado en ' + crm + " ejecutado correctamente.";
                app.helper.showSuccessNotification({"message": message});
                var htmlResult = data.result.result;
                $('#modal_confirm #infoResponseExecGit').html(htmlResult);
                app.helper.showVerticalScroll(jQuery('#modal_confirm .modal-body'), {'setHeight': '380px'});
                app.helper.showHorizontalScroll(jQuery('#modal_confirm .modal-body'));
                jQuery('#modal_confirm').modal('show');
            }
        );
    },

    /**
     * @author Mario Rivera
     * @function executeMysql
     * @description Función para ejecutar consultas Mysql en un crm
     */
    executeMysql: function(crm){
        var commandValue = jQuery('#modal_confirm #command').val().trim();
        if(!commandValue || commandValue === ''){
            app.helper.showErrorNotification({"message":"No has escrito ningún comando..."});
            return false;
        }

        commandValue = commandValue.replace(/\s+/g, " ");
        var permisionQuery = ["select", "update", "alter table"];
        var permision = false;
        $.each(permisionQuery, function( index, value) {
            var findString = commandValue.toLowerCase().search(value);
            if(findString !== -1){
                permision = true;
            }
        });
        if(permision !== true){
            console.log('');
            app.helper.showErrorNotification({"message":"Error en la consulta <b>" + commandValue + '.</b> Solo puedes ejecutar <b>select, update o alter table</b>'});
            return false;
        }
        var commandMysql = commandValue;
        var params = {};
        params.module = app.getModuleName();
        params.action = 'ExecuteMysql';
        params.crm = crm;
        params.command = commandMysql;
        params.record = jQuery('#server_path').val();
        app.helper.showProgress();
        $('#modal_confirm #infoResponseExecGit').html('');
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                var message = "Commando " + commandMysql + ' ejecutado en ' + crm + " ejecutado correctamente.";
                app.helper.showSuccessNotification({"message": message});
                jQuery('#command').attr('rows', 2);
                if(data.result.list){
                    var resultado = data.result.result;
                    var table = "<div class='table-responsive'><table class='table table-bordered'>";
                    var tableHeadRow = '<thead><tr>';
                    var tableHeadCol = '';
                    if(resultado){
                        $.each(resultado, function( index, value) {
                            if(index === 0){
                                $.each(value, function( indexI, valueI) {
                                    tableHeadCol += "<th>" + indexI + "</th>";
                                });
                            }
                        });
                        tableHeadRow += tableHeadCol + "</tr></thead>";
                        var tbody = '<tbody>';
                        var tableBodyColumns = '';
                        $.each(resultado, function( index, value) {
                            tableBodyColumns += "<tr>";
                            $.each(value, function( indexI, valueI) {
                                tableBodyColumns += "<td>" + valueI + "</td>";
                            });
                            tableBodyColumns += "</tr>";
                        });
                        tbody = tbody + tableBodyColumns + "</tbody>";
                        table = table + tableHeadRow + tbody + "</table></div>";
                        $('#modal_confirm #infoResponseExecMysql').html(table);
                    }else{
                        $('#modal_confirm #infoResponseExecMysql').html("<table><tr><td><h3 class='text-center'>Sin resultados</h3></td></tr></table>");
                    }

                }else{
                    var htmlResult = data.result.result;
                    $('#modal_confirm #infoResponseExecMysql').html(htmlResult);
                }

                app.helper.showVerticalScroll(jQuery('#modal_confirm .modal-body'), {'setHeight': '380px'});
                app.helper.showHorizontalScroll(jQuery('#modal_confirm .modal-body'));
                jQuery('#modal_confirm').modal('show');
            }
        );
    },

    /**
     * @author Andrés Velasquez
     * @function moveCrm
     * @description Función que realiza un ajax para mover un crm
     * @param  {} table-> instancia del datatable,data->formulario del mdal, crms-> crm a mover
     */
    moveCrm: function(table, data, crms){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'moveCrm',
            'data': data,
            'record': jQuery('#server_path').val(),
            'crm': crms
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data){
                    var dataSet = $.parseJSON(data.result);
                    if(dataSet.error == 'Existe'){
                        app.helper.showErrorNotification({"message":"El crm ya existe"});
                    } else {
                        app.helper.showSuccessNotification({"message":"Crm movido"});
                        table.row($('#'+crms)).remove().draw();
                    }
                } else {
                    app.helper.showErrorNotification({"message":"No se pudo mover"});
                }
                jQuery('#modal_confirm').modal('hide');
            }
        );
    },

     /**
     * @author Jonnattan Choque
     * @function copyCrm
     * @description Función que realiza un ajax para mover un crm
     * @param  {} table-> instancia del datatable,data->formulario del mdalr
     */
    copyCrm: function(table,data){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'copyCrm',
            'data': data,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                var dataSet = $.parseJSON(data.result);
                if(dataSet.error == 'Existe'){
                    app.helper.showErrorNotification({"message":"El crm ya existe"});
                }else if(dataSet.error == 'Fail'){
                    app.helper.showErrorNotification({"message":"Debe llenar todos los campos"});
                }else{
                    if(data){
                        app.helper.showSuccessNotification({"message":"Crm creado"});
                        //thisInstance.draw(table);
                    } else {
                        app.helper.showErrorNotification({"message":"No se pudo crear el Crm"});
                    }
                    jQuery('#modal_confirm').modal('hide');
                }
            }
        );
    },

     /**
     * @author Jonnattan Choque
     * @function createCrm
     * @description Función que realiza un ajax para crear un crm
     * @param  {} table-> instancia del datatable,data->formulario del mdalr
     */
    createCrm: function(table,data){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'createCrm',
            'data': data,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                var dataSet = $.parseJSON(data.result);
                if(dataSet.error == 'Existe'){
                    app.helper.showErrorNotification({"message":"El crm ya existe"});
                }else if(dataSet.error == 'Fail'){
                    app.helper.showErrorNotification({"message":"Debe llenar todos los campos"});
                }else{
                    if(data.success){
                        var json = JSON.parse(data.result);
                        app.helper.showSuccessNotification({"message":"Crm creado"});
                        table.row.add(json).draw();
                    }else{
                        app.helper.showErrorNotification({"message":"No se pudo crear el Crm"});
                    }      
                    jQuery('#modal_confirm').modal('hide');
                }
            }
        );
    },

     /**
     * @author Jonnattan Choque
     * @function updateCrm
     * @description Función que realiza un ajax para actualizar un crm
     * @param  {} table-> instancia del datatable,data->formulario del modal
     */
    updateCrm: function(table,data){
        thisInstance = this;
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'SaveAjax',
            'mode': 'updateCrm',
            'data': data,
            'record' : jQuery('#server_path').val(),
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                try {
                    var dataSet = $.parseJSON(data.result);
                } catch (e) {
                    var dataset = null;
                }
                if(dataSet) {
                    if(dataSet.error == 'Existe'){
                        app.helper.showErrorNotification({"message":"El crm ya existe"});
                    }else if(dataSet.error == 'Fail'){
                        app.helper.showErrorNotification({"message":"Debe llenar todos los campos"});
                    }else if(dataSet.error == 'Premium'){
                        app.helper.showErrorNotification({"message":"El crm es premium"});
                    }
                }
                else{
                    if(data){
                        app.helper.showSuccessNotification({"message":"Crm Actualizado"});
                        thisInstance.draw(table);
                    } else {
                        app.helper.showErrorNotification({"message":"No se pudo crear el Crm"});
                    }
                    jQuery('#modal_confirm').modal('hide');
                }
            }
        );
    },

     /**
     * @author Jonnattan Choque
     * @function draw
     * @description Función que vuelve a dibujar la tabla con la nueva información
     * @param  {} table-> instancia del datatable,title->nombre del servidor seleccionado
     */
    draw: function(table,title = null){
        thisInstance = this;
        thisInstance.getListCrms(title).then(function(dataSet){
            table.clear().rows.add(dataSet).draw();
        })
    },

     /**
     * @author Jonnattan Choque
     * @function viewInform
     * @description Función que abre modal de informes para seleccionar uno en especifico
     * @param  {} table-> instancia del datatable
     */
    viewInform: function(table){
        var thisInstance = this;
        
        $(document).on('click', '.ver_informe', function(event) {
            var crms = table.rows('.selected').ids().toArray();
            var count = table.rows('.selected').data().length;

            if (count <= 0){
                app.helper.showErrorNotification({"message":"No se selecciono ningun crm"});
            }else{
                var title = 'Generar Informe: '+crms;
                var params = {};
                params['module'] = "ControlPanel";
                params['view'] = "ModalReport";
                params['crm'] = crms;
                params['title'] = title;
                AppConnector.request(params).then(
                    function (data) {
                        jQuery('#getModal').html(data.result);
                        jQuery('#modal_report').modal('show');
                        jQuery('.datepicker').datepicker({
                            format: 'yyyy-mm-dd',
                        });
                        
                        $('#report').on('change', function () {
                            if($(this).val() == 'implementation_rpt'){
                                jQuery('.date_report1').fadeOut();
                                jQuery('.date_report2').removeClass('hide');
                                jQuery('.btn_report2').removeClass('hide');
                                jQuery('.date_report2').fadeIn();
                                jQuery('.datepicker_mount').attr('disabled',false);
                                jQuery('.datepicker').attr('disabled',true);
                            }
                            else if($(this).val() == 'report_storage'){
                                jQuery('.date_report1').remove();
                                jQuery('.date_report2').remove();
                                jQuery('.btn_report2').remove();
                            }else{
                                jQuery('.date_report1').fadeIn();
                                jQuery('.date_report2').addClass('hide');
                                jQuery('.btn_report2').addClass('hide');
                                jQuery('.date_report2').fadeOut();
                                jQuery('.datepicker').attr('disabled',false);
                                jQuery('.datepicker_mount').attr('disabled',true);
                            }
                        });

                        //Agregar fecha
                        $('.addDate').on('click', function (event) {
                            $(".datepicker_mount:last").attr('disabled',true);
                           var clone =  $(".date_clone:first").clone().insertAfter("div.date_report2:last");
                           clone.removeClass('hide');
                           clone.find('.datepicker_mount').attr('disabled',false);
                        });
                        
                        //Ejecutar el datepicker
                        $('body').on('focus',".datepicker_mount", function(){
                            $(this).datepicker({
                                format: 'yyyy-mm',
                                viewMode: "months", 
                                minViewMode: "months"
                            });
                        });

                        //eleminar fecha agregada
                        $('body').on('click',".deleteRowDate", function(){
                            $(this).parent().parent().remove();
                        });
                    }
                );
            }            
        }); 
    },

     /**
     * @author Jonnattan Choque
     * @function callReport
     * @description Función que se ejecuta al dar clic al modal de informes y llama la función getReports
     */
    callReport: function(){
        var thisInstance = this;
        $(document).on('click', '.callReport', function(event) {
            jQuery('#getReport').html('');
            thisInstance.getReports().then(function(data,mode){
                switch (mode) {
                    case "use_rpt"          : thisInstance.useRpt(data); break;
                    case "post_use_rpt"     : thisInstance.postUseRpt(data); break;
                    case "bar_use_rpt"      : thisInstance.barUserRpt(data); break;
                    case "pie_users_rpt"    : thisInstance.pieUsersRpt(data); break;
                    case "implementation_rpt"    : thisInstance.implementationRpt(data); break;
                    case "report_storage"    : thisInstance.reportStorage(data); break;
                }
            });
        });
    },

    /**
     * @author Marionel Rivera
     * @function searchAll
     * @description Función que realiza un ajax para buscar un crm en todos los servidores
     * @returns json-> data del crm
     */
    searchAll: function(){
        var buttonSearch = jQuery('[name="searchInServers"]');
        var form = $('#searchAll');
        var params = {};
        buttonSearch.click(function () {
            var searchString = form.find('[name="searchString"]').val();
            if(searchString.trim().length <= 0){
                alert('Debes llenar este campo');
            }else{
                params = {
                    'module' : app.getModuleName(),
                    'action' : 'SearchAll',
                    'searchString' : searchString
                };
                app.helper.showProgress();
                AppConnector.request(params).then(
                    function (data) {
                        var tbl_row = "";
                        if(data.result.length > 0){
                            jQuery.each(data.result, function (key,value) {
                                var viewHrefServer = value.viewResult + "&record=" + value.record + "&nameCrm=" + value.crm;
                                tbl_row += "<tr>" +
                                    "<td width='50%' align='center'>" +
                                    value.dns +
                                    "</td>" +
                                    "<td width='50%' align='center'>" +
                                    "<a href='" + viewHrefServer +"'>" + value.nameServer + "</a>" +
                                    "</td>" +
                                    "</tr>";
                            });
                            app.helper.hideProgress();
                            $('#infoSearchAllModal #bodyResult').html(tbl_row);
                            jQuery('#infoSearchAllModal').modal('show');
                        }
                        else{
                            tbl_row += "<tr>" +
                                "<td width='100%' colspan='2' align='center'>" +
                                "El crm " + "<b>" + searchString + "</b>" + " no existe" +
                                "</td>" +
                                "</tr>";
                            app.helper.hideProgress();
                            $('#infoSearchAllModal #bodyResult').html(tbl_row);
                            jQuery('#infoSearchAllModal').modal('show');
                        }
                    }
                );
            }
        });
    },
     /**
     * @author Jonnattan Choque
     * @function getReports
     * @description Función que realiza un ajax para consultar determinado informe
     * @returns json-> data del informe
     */
    getReports: function(){
        var data = $('#formReport').serialize();
        var mode = jQuery('#report').val();
        thisInstance = this;
        var aDeferred = jQuery.Deferred();
        var params = {};
        params = {
            'module': app.getModuleName(),
            'action': 'Report',
            'mode': mode,
            'data': data,
            'record': jQuery('#server_path').val()
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                app.helper.hideProgress();
                if(data){
                    aDeferred.resolve(data,mode);
                }
            }
        );
        return aDeferred.promise();
    },

    useRpt: function(data){
        var dataSet = $.parseJSON(data.result);
        jQuery('#getReport').html('');
        $.each(dataSet, function( index, value ) {
            jQuery('#modal_report').modal('hide');
            jQuery('#getReport').append('<h4 class="text-center">'+index+'</h4><table style="width:100%;" id="Uso'+index+'"></table>');
            jQuery('.content-report').removeClass('hide');
            jQuery('.content-report').fadeIn();
            $('#Uso'+index+'').DataTable( {
                data: value,
                "searching": false,
                "lengthChange": false,
                "info": true,
                "order": [[0, "asc"]],
                "bSort": false,
                columns: [
                    { data: "user_name",title: 'Usuario' },
                    { data: "name",title: 'Nombre' },
                    { data: "login",title: 'Logins' },
                    { data: "activity_crm",title: 'Actividades CRM' },
                    { data: "activity_mobile",title: 'Actividades APP' },
                    { data: "status",title: 'Estado' },
                ],
                //rowReorder: true
            } );
        });
        
    },

    postUseRpt: function(data){
        jQuery('#getReport').html('');
        var dataSet = $.parseJSON(data.result);
        jQuery('#modal_report').modal('hide');
        jQuery('#getReport').html('<table style="width:100%" id="postUso"></table>');
        jQuery('#getReport').append('<div id="chartdiv" style="height:400px;width:600px; "></div>');
        jQuery('.content-report').removeClass('hide');
        jQuery('.content-report').fadeIn();
        var table = $('#postUso').DataTable( {
            dom: 'Bfrtip',
            buttons: [
                'excel'
            ],
            data: dataSet.table,
            "createdRow": function( row, data, dataIndex){
                if( data.riesgo ==  'Muy Bajo'){
                    $(row).addClass('alert-danger');
                }else if( data.riesgo ==  'Bajo'){
                    $(row).addClass('alert-warning');
                }else if( data.riesgo ==  'Alto'){
                    $(row).addClass('alert-info');
                }else if( data.riesgo ==  'Muy Alto'){
                    $(row).addClass('alert-success');
                }
            },
            "searching": false,
            "lengthChange": false,
            "info": true,
            columns: [
                { data: "crm",title: 'Crm' },
                { data: "usuarios",title: 'Usuarios' },
                { data: "uso",title: 'uso' },
                { data: "promedio", title:'promedio' },
                { data: "nivel", title:'Nivel Uso' },
            ],
            rowReorder: true
        } );
        //Grafico
        var colors = [];
        var array = Object.keys(dataSet.graphic).map(function(data){
            if(data == 'Muy Bajo'){
                colors.push('#cb3131');
            }else if(data == 'Bajo'){
                colors.push('#f0c36d');
            }else if(data == 'Alto'){
                colors.push('#667fec');
            }else if(data == 'Muy Alto'){
                colors.push('#63bd41');
            }
            return [data,dataSet.graphic[data]];
        });

        var data = array;
        var plot1 = jQuery.jqplot ('chartdiv', [data], 
        { 
            seriesDefaults: {
                // Make this a pie chart.
                renderer: jQuery.jqplot.PieRenderer, 
                rendererOptions: {
                    // Put data labels on the pie slices.
                    // By default, labels show the percentage of the slice.
                    showDataLabels: true
                },
            }, 
            title:{
                show:true,
                text: 'Uso Postventa',
                fontSize:35
            },
            highlighter: {
                show: true,
                useAxesFormatters: false,
                fontSize: 15,
                tooltipFormatString: '%s'
            },
            seriesColors:colors,
            legend: { show:true, location: 'e' }
        });
    },

    barUserRpt: function(data){
        jQuery('#getReport').html('');
        var dataSet = $.parseJSON(data.result);
        jQuery('#modal_report').modal('hide');
        jQuery('#getReport').html('<table style="width:100%" id="pieUso"></table>');
        jQuery('#getReport').append('<div id="chartdiv" style="height:400px;width:600px; "></div>');
        jQuery('.content-report').removeClass('hide');
        jQuery('.content-report').fadeIn();

        var s1 = dataSet.web;
        var s2 = dataSet.app;
        var ticks = dataSet.crms;
        var maximo = parseInt(dataSet.max)+20;
         
        plot2 = $.jqplot('pieUso', [s1, s2], {
            seriesDefaults: {
                renderer:$.jqplot.BarRenderer,
                pointLabels: { show: true },
                rendererOptions: {
                    smooth: true
                },
            },
            title:{
                show:true,
                text: 'Uso',
                fontSize:15
            },
            legend: {
                show: true,
                location: 'n',
                placement: 'insideGrid',
                labels:["WEB", "APP"],
                fontSize: 25,
                rowSpacing: '0.9em'
            },
            seriesColors: ["#3366cc", "#41c3ac"],
            axes: {
                xaxis: {
                    renderer: $.jqplot.CategoryAxisRenderer,
                    ticks: ticks,
                    tickOptions: {
                        fontSize: '10pt'
                      }
                },
                yaxis: {              
                    min: 0,
                    max: parseInt(maximo),
                    tickOptions: { 
                        formatString: '%d' 
                    } 
                }
            }
        });
    },

    pieUsersRpt: function(data){
        jQuery('#getReport').html('');
        var dataSet = $.parseJSON(data.result);
        jQuery('#modal_report').modal('hide');
        jQuery('#getReport').append('<div id="chartdiv2" style="height:400px;width:600px; "></div>');
        jQuery('.content-report').removeClass('hide');
        jQuery('.content-report').fadeIn();
        //Grafico
        var result = [];
        $.each(dataSet, function (i,v)
        {
            for(var i in v){
                result.push([i, v [i]]);
            }
            
        });

        $.jqplot('chartdiv2', [result], {
            gridPadding: {top:0, bottom:38, left:0, right:0},
            seriesDefaults:{
                renderer:$.jqplot.PieRenderer, 
                rendererOptions: {
                    showDataLabels: true,
                    padding: 10,
                    sliceMargin: 6,
                    shadow: false
                }
            },
            title:{
                show:true,
                text: 'Torta Usuarios',
                fontSize:15
            },
            highlighter: {
                show: true,
                useAxesFormatters: false,
                sizeAdjust: 15,               
                tooltipFormatString: '%s'
            },
            legend:{
                show:true, 
                fontSize: 15,
                border: false
            }      
        });
    },

    implementationRpt: function(data){
        jQuery('#getReport').html('');
        var dataSet = $.parseJSON(data.result);
                    
        $.each(dataSet, function( index, value ) {
            var tableHeaders = '';
            $.each(value.columns, function(i, val){
                tableHeaders += "<th>" + val + "</th>";
            });

            jQuery('#modal_report').modal('hide');
            jQuery('#getReport').css('display','inline-flex');
            jQuery('#getReport').append('<div style="display:block"><h4 class="text-center">Implementación '+value.date+'</h4><table style="width:calc(100%/3) !important;border: 1px solid #1116;" id="displayTable'+index+'" class="display compact cell-border"><thead><tr>' + tableHeaders + '</tr></thead></table></div>');
            jQuery('.content-report').removeClass('hide');
            jQuery('.content-report').fadeIn();
            $('#displayTable'+index+'').DataTable( {
                data: value.table,
                "searching": false,
                "lengthChange": false,
                "info": false,
                "paging": false,
                "order": [[0, "asc"]],
                "bSort": false, 
                
                //rowReorder: true
            } );
        });
    },

    reportStorage: function(data){
        jQuery('#getReport').html('');
        var dataSet = data.result;
        var title_report = jQuery('.title_report');
        title_report.text(' de almacenamiento');
        var tHead = "<tr><th class='text-center info'> Crm </th> <th class='text-center info'> Uso de almacenamiento </th></tr>";
        var tBody = '';
        $.each(dataSet, function( index, value ) {
            if(value.usado == 'No storage'){
                tBody += '<tr class="danger"><td class="text-center">' + value.crm + '</td><td class="text-center">' + value.usado + '</td></tr>';
            }else{
                tBody += '<tr class="success"><td class="text-center">' + value.crm + '</td><td class="text-center">' + value.usado + '</td></tr>';
            }
        });
        jQuery('#modal_report').modal('hide');
        jQuery('#getReport').append('<div style="display:block">' +
            '<table style="width: 100% !important;" class="table table-bordered">' +
            '<thead>' + tHead + '</thead>' +
            '<tbody>' + tBody + '</tbody>' +
            '</table>' +
            '</div>');
        jQuery('.content-report').removeClass('hide');
        jQuery('.content-report').fadeIn();
    },

     /**
     * @author Jonnattan Choque
     * @function callExclude
     * @description Función que realiza un ajax para consultar determinado informe
     */
    callExclude: function(){
        var thisInstance = this;

        $(document).on('click', '.viewExcludes', function(event) {
            var crm = $(this).data("crm");
            var params = {};
            params['module'] = app.getModuleName();
            params['view'] = "ModalExclude";
            params['crm'] = crm;
            params['record'] = jQuery('#server_path').val();
            app.helper.showProgress();
            
            AppConnector.request(params).then(
                function (data) {
                    app.helper.hideProgress();
                    jQuery('#getModal').html(data.result);
                    jQuery('#modal_exclude').modal('show');
                }
            );
        });
    },

    /**
     * @author Jonnattan Choque
     * @function updateAllCrms
     * @description Función que realiza un ajax para actualizar todos los crms
     * @returns json-> data success o error
     */
    updateAllCrms: function(table){
        thisInstance = this;
        var params = {};
        var info = {};
        var jsonObj = [];
        var crms = table.rows().data().toArray();
        $.each(crms, function (indexInArray, valueOfElement) { 
            if(valueOfElement["crm_type"] == "Estandar"){
                jsonObj.push({
                    crm_type: valueOfElement["crm_type"],
                    crm     : valueOfElement["DT_RowId"],
                });
            }
        });
        
        params = {
            'module' : app.getModuleName(),
            'action' : 'UpdateAllCrms',
            'crms'   : JSON.stringify(jsonObj),//obtiene los crms seleccionados
            'record': jQuery('#server_path').val()
        };
        app.helper.showProgress();
        AppConnector.request(params).then(
            function (data) {
                if(data.result){
                    app.helper.showSuccessNotification({"message":"Todos los crms se han actualizado"});
                    thisInstance.draw(table);
                    app.helper.hideProgress();
                }else{
                    app.helper.showErrorNotification({"message":"No se han podido actualizar los crms"});
                }app.helper.hideProgress();

            }
        );
    },


    // to Registering  required Events on list view page load
    registerEvents: function() {
        var thisInstance = this;
        thisInstance.drawListCrms();
        thisInstance.searchAll();
        thisInstance.callExclude();
    }
});

