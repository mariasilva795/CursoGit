<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

require_once 'modules/ControlPanel/ControlPanel.php';
define('CRMPANEL', '/development/cpanelmaria');
define('PREFIX', 'datacrm_amazon1_');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', '2593826');

class ControlPanel_SaveAjax_Action extends Vtiger_Action_Controller{

	protected $webservice;
    protected $controlPanel;
    protected $server; //'datacrm.la';
    protected $recordModel;
    
    public function __construct() {
        $this->exposeMethod('createCrm');
        $this->exposeMethod('blockCrm');
        $this->exposeMethod('unblockCrm');
        $this->exposeMethod('copyCrm');
        $this->exposeMethod('updateCrm');
        $this->exposeMethod('deleteCrm');
        $this->exposeMethod('moveCrm');
        $this->exposeMethod('backUpDb');
        $this->exposeMethod('validateExistEmails');
        $this->controlPanel = new ControlPanel();
        $this->server = $_SERVER["HTTP_HOST"];
    }

	/**
	 * process
	 * @author Jonnattan Choque
	 * @param  mixed $request
	 * @return = funcion setReportsAction
	 */
    public function process(Vtiger_Request $request) {
        global $current_user;
        $this->recordModel = Vtiger_Record_Model::getInstanceById($request->get('record'), $request->get('module'));
        $params = array();
        parse_str($request->get('data'), $params);
        $firts = "Acción Ejecutada => {$this->getTraductionModes($request->get('mode'))} | Servidor  {$this->recordModel->get('servername')} | ";
        if($request->get('mode') == 'deleteCrm'){
            $two = "Crm => {$request->get('crm')}";
        }else if($request->get('mode') == 'blockCrm' or $request->get('mode') == 'unblockCrm'){
            $two = "Crms => {$request->get('crms')}";
        }else if($request->get('mode') == 'moveCrm'){
            $recordModelOther = Vtiger_Record_Model::getInstanceById($params['destination'], $request->get('module'));
            $two = " a servidor => {$recordModelOther->get('servername')} | Crms => {$request->get('crm')}";
        }else if($request->get('mode') == 'copyCrm'){
            $two = "Desde => {$params['tipo']} | Hacia => {$params['crm']}";
        }else if($request->get('mode') == 'backUpDb'){
            $two = "Crm => {$request->get('crm')}";
        }else{
            $two = " Tipo => {$params['tipo']} | Crm => {$params['crm']}";
        }
        $recordModelComments = Vtiger_Record_Model::getCleanInstance('ModComments');
        $messageComment =  $firts . $two;
        $recordModelComments->set('commentcontent', $messageComment);
        $recordModelComments->set('assigned_user_id', $current_user->id);
        $recordModelComments->set('related_to', $this->recordModel->getId());
        $recordModelComments->set('is_private', 0);
        $recordModelComments->save();

        $mode = $request->getMode();
        if(!empty($mode) && $this->isMethodExposed($mode)) {
            $result = $this->invokeExposedMethod($mode, $request);
            echo $result;
        }
    }

    public function getTraductionModes($position){
        $modes = [
            "createCrm" => 'Crear Crm',
            "blockCrm" => 'Bloquear Crm',
            "unblockCrm" => 'Desbloquear Crm',
            "copyCrm" => 'Copiar Crm',
            "updateCrm" => 'Actualizar Crm',
            "deleteCrm" => 'Borrar Crm',
            "moveCrm" => 'Mover Crm',
            "backUpDb" => 'Hacer backup de la base de datos',
        ];
        return $modes[$position];
    }

    /**
     * createCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webService de los servidores para crear un crm
     * @return = data del crm creado
     */
    public function createCrm(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $servidores = $moduleModel->getServersInfo();    
        $params = array();
        parse_str($request->get('data'), $params);//convert form serialize to array

        $tipo = $params['tipo'];
        $crm  = $params['crm'];

        try {     
            if (empty($tipo) || empty($crm)) {
                throw new Exception( 'Fail', 1);   
            }     
            //Note Consulta si ya existe el crm
            foreach ($servidores as $key => $value) {
                $this->controlPanel->wsconfig['url'] = $value['dns'].'/'.CRMPANEL;
                $params = array('crm'=>$crm,'url'=>$value['dns'], 'privateip'=>$value['private_ip']);
                $ws1 = $this->controlPanel->connectWebservice();
                $exist = $ws1->controlPanel($params,$operation = 'infoCrm');
                if(count($exist) == 1){
                    throw new Exception( 'Existe', 1);
                }
            }        
            $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;
            $params = array('crm'=>$crm,'tipo'=>$tipo,'server'=>$this->recordModel->get('servername'), 'privateip'=>$this->recordModel->get('private_ip')); 
            $webservice = $this->controlPanel->connectWebservice();   
            $result = $webservice->controlPanel($params,$operation = 'createCrm');
            if($result){
                $params = array('crm'=>$crm,'url'=>$this->recordModel->get('dns'), 'privateip'=>$this->recordModel->get('private_ip')); 
                $ws1 = $this->controlPanel->connectWebservice();
                $exist = $ws1->controlPanel($params,$operation = 'infoCrm');
                return json_encode($exist[0]);
            }else{
                return json_encode(false);
            }
        } catch (Exception $e) {
           $error = $e->getMessage();
           echo json_encode(compact('error'));
        }  
    }

    /**
     * blockCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webService de los servidores para bloquear varios crms
     * @return true/false
     */
    public function blockCrm(Vtiger_Request $request) {
        $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;

        $crms = $request->get('crms');
        $params = array('crms'=>$crms,'privateip'=>$this->recordModel->get('private_ip'));  
        $webservice = $this->controlPanel->connectWebservice();
        $result = $webservice->controlPanel($params,$operation = 'blockCrm');
        echo json_encode($result);
    }

    /**
     * unblockCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webService de los servidores para desbloquear varios crms
     * @return true/false
     */
    public function unblockCrm(Vtiger_Request $request) {
        $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;
        $crms = $request->get('crms');
        $days = 15;//$request->get('days');
        $params = array('crms'=>$crms,'days'=> $days,'privateip'=>$this->recordModel->get('private_ip'));  
        $webservice = $this->controlPanel->connectWebservice();      
        $result = $webservice->controlPanel($params,$operation = 'unblockCrm');
        echo json_encode($result);
    }

    /**
     * copyCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webservices para copiar un crm a demos
     * @return true/false
     */
    public function copyCrm(Vtiger_Request $request) {
        try {
            $params = array();
            parse_str($request->get('data'), $params);

            $tipo = $params['tipo'];
            $crm  = $params['crm']; 

            if (empty($crm)) {
                throw new Exception( 'Fail', 1);   
            }       
            //Note Consulta si ya existe el crm en el demo
            $urlDemos = 'https://demos.datacrm.la'.CRMPANEL;
            $params = array('crm'=>$crm,'url'=>$urlDemos, 'privateip'=>'10.187.237.77');        
            $this->controlPanel->wsconfig['url'] = $urlDemos;
            $ws1 = $this->controlPanel->connectWebservice();
            $exist = $ws1->controlPanel($params,$operation = 'infoCrm');
            if(count($exist) == 1){
                throw new Exception( 'Existe', 1);   
            }else{         
                $server =  'server2';
                $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;
                $ws2 = $this->controlPanel->connectWebservice();
                $params = array('crm'=>$crm,'old_crm'=>$tipo,'server'=>$server,'server_origen' => $this->recordModel->get('dns'));  
                $result = $ws2->controlPanel($params,$operation = 'copyCrm');

                if(!empty($result)){
                    $this->controlPanel->wsconfig['url'] = 'https://demos.datacrm.la'.CRMPANEL;//$this->recordModel->get('servername').'/'.CRMPANEL;
                    //@note Si hay error al contectar al webservice no es posible obtener el error
                    $ws3 =  $this->controlPanel->connectWebservice();
                    $result2 = $ws3->controlPanel($result,$operation = 'getCopyCrm');
                    echo json_encode($result2);
                }else{
                    throw new Exception( 'algo paso', 1);   
                }    
            }
        } catch (Exception $e) {
            $error = $e->getMessage();
            echo json_encode(compact('error'));
        }
    }

    /**
     * updateCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webservice para actualizar crm a uno seleccionado
     * @return true/false
     */
    public function updateCrm(Vtiger_Request $request) {
        try {
            $params = array();
            parse_str($request->get('data'), $params);

            $tipo = $params['tipo'];
            $crm  = $params['crm'];
            $crm_pass  = $params['crm_pass'];
            $crms = explode (',', $crm);
            if(empty($crm)) {
                throw new Exception( 'Fail', 1);   
            } else {
                foreach($crms as $crm){
                    $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;
                    $paramsInfo = array('crm' => $crm, 'server' => $this->recordModel->get('servername'), 'privateip'=>$this->recordModel->get('private_ip'));
                    $webservice = $this->controlPanel->connectWebservice();    
                    $tipo_crm = $webservice->controlPanel($paramsInfo,$operation = 'infoCrm');
                    // @note - algunos crms estan como premiun premium Premiu
                    if(preg_match('/(premiu)/', strtolower($tipo_crm[0]->crm_type))) {
                        throw new Exception( 'Premium', 1);   
                    }
                    $params = array('crm'=>$crm,'tipo'=>$tipo, 'server'=>$this->recordModel->get('dns'), 'privateip'=>$this->recordModel->get('private_ip'), 'crm_type'=>$tipo_crm[0]->crm_type, 'crm_pass'=>$crm_pass); 
                    $result = $webservice->controlPanel(($params), $operation = 'updateCrm');
                    echo json_encode($result);
                }
            }
        } catch (Exception $e) {
            $error = $e->getMessage();
            echo json_encode(compact('error'));
        }
    }

    /**
     * deleteCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webservice para eleminar un crm 
     * @return true/false
     */
    public function deleteCrm(Vtiger_Request $request) {
        $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;
        $webservice = $this->controlPanel->connectWebservice();
        $params = array('crm'=>$request->get('crm'), 'privateip'=>$this->recordModel->get('private_ip'), 'only'=>true);
        $result = $webservice->controlPanel($params,$operation = 'deleteCrm');
        return json_encode($result);
    }

    /**
     * backUpDb
     * @author Mario Rivera
     * @param  mixed $request
     * @description Función para hacer copia de la base de datos a traves del webservice
     * @return true/false
     */
    public function backUpDb(Vtiger_Request $request) {
        $dns = $this->recordModel->get('dns');
        $this->controlPanel->wsconfig['url'] = $dns.'/'.CRMPANEL;
        $webservice = $this->controlPanel->connectWebservice();
        $params = array('crm'=>$request->get('crm'), 'privateip'=>$this->recordModel->get('private_ip'), "dns" => $dns);
        $result = $webservice->controlPanel($params,$operation = 'backUpDb');
       
        $response = new Vtiger_Response();
        $response->setResult($result);
        $response->emit();
    }

    /**
     * moveCrm
     * @author Jonnattan Choque
     * @param  mixed $request
     * @description Función que consume webservice para mover un crm entre servidores
     * @return true/false
     */
    public function moveCrm(Vtiger_Request $request) {
        try {
            $paramsRequest = array();
            parse_str($request->get('data'), $paramsRequest);
            $recordModel = Vtiger_Record_Model::getInstanceById($paramsRequest['destination'], $request->get('module'));
            $params = array(
                'crm'       => $request->get('crm'),
                'url'       => $recordModel->get('dns'),
                'privateip' => $recordModel->get('private_ip'),
                'only_type' => true
            );
            $this->controlPanel->wsconfig['url'] = $recordModel->get('dns').'/'.CRMPANEL;
            $ws1 = $this->controlPanel->connectWebservice();
            $exist = $ws1->controlPanel($params, $operation = 'infoCrm');
            if(count($exist) == 1){
               throw new Exception( 'Existe', 1);  
            }else{
                $this->controlPanel->wsconfig['url'] = $this->recordModel->get('dns').'/'.CRMPANEL;                
                $webservice = $this->controlPanel->connectWebservice();
                $paramsInfo = array(
                    'crm'        => $request->get('crm'),
                    'url'        => $recordModel->get('dns').'/'.CRMPANEL,
                    'privateip'  => $this->recordModel->get('private_ip'),
                    'only_type'  => true
                );
                $infoCrm2Move = $webservice->controlPanel($paramsInfo, $operation = 'infoCrm');
                $params2Delete = array(
                    'crm'        => $request->get('crm'),
                    'server'     => $this->recordModel->get('servername'),
                    'privateip'  => $this->recordModel->get('private_ip')
                );

                if(strtolower($infoCrm2Move[0]->crm_type) !== 'estandar') {
                    $params2Delete['additional'] = true;
                }
                $result = $webservice->controlPanel($params2Delete, $operation = 'deleteCrm');
                if($result->success) {
                    $recordModel = Vtiger_Record_Model::getInstanceById($paramsRequest['destination'], $request->get('module'));
                    $this->controlPanel->wsconfig['url'] = $recordModel->get('dns').'/'.CRMPANEL;
                    $webserviceDestination = $this->controlPanel->connectWebservice();
                    $params2Destination = array(
                        'crm'               => $request->get('crm'),
                        'sourcePrivateip'   => $this->recordModel->get('private_ip'),
                        'privateip'         => $recordModel->get('private_ip'),
                        'newmode'           => $result->newmode,
                        'path'              => $result->path
                    );
                    $result2 = $webserviceDestination->controlPanel($params2Destination, $operation = 'moveCrm');
                    echo json_encode($result2);
                } else {
                    echo json_encode(false);
                }
            }
        } catch (Exception $e) {
            $error = $e->getMessage();
            echo json_encode(compact('error'));
        }
    }

    public function validateExistEmails(Vtiger_Request $request) {
        global $adb;
        $crm = $request->get('crm');
        $privateip = $this->recordModel->get('private_ip');
        $namedb = PREFIX.$crm;
        $cmd = "mysql -h ".$privateip." -u ".DB_USERNAME." -p".DB_PASSWORD." ".$namedb." ";
		//$cmd = "mysql -u ".DB_USERNAME." -p".DB_PASSWORD." ".$namedb." ";
        $cmd.= "-e '
            SELECT 
                GROUP_CONCAT(users.email1)
            FROM
                vtiger_users users
                    INNER JOIN
                vtiger_crmentity crmentity ON crmentity.crmid = users.id
            WHERE 
                crmentity.deleted = 0;' ";
        $result = shell_exec($cmd);
        $result = explode(PHP_EOL, $result);
        $emails = explode(',', $result[1]);
        $emails = implode("','", $emails);
        $query = "SELECT 
            GROUP_CONCAT(contacts.email)
        FROM
            vtiger_contactdetails contacts
                INNER JOIN
            vtiger_crmentity crmentity ON crmentity.crmid = contacts.contactid
        WHERE
            crmentity.deleted = 0
            AND
            contacts.email IN ('$emails')
        GROUP BY contacts.email";
        $existingEmails = explode(',', $adb->getOne($query));
        $existingEmails = array_unique($existingEmails);

        if(!empty($existingEmails)) {
            return json_encode($existingEmails);
        } else {
            return false;
        }
    }
    
    public function checkPermission(Vtiger_Request $request) {
		return true;
    }
}
?>
