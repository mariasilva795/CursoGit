<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/
require_once 'modules/ControlPanel/ManagerDB.php';
define('PREFIX', 'datacrm_amazon1_');
define('PREFIXDEMO', 'datacrm_contingencia_');

class ControlPanel_Record_Model extends Vtiger_Record_Model {
	
	/**
     * getCrmsBase
     * @author Jonnattan Choque
     * @description Función que consulta los crms bases (alpha, beta, release, etc)
     * @return array
     */
	public function getCrmsBase() {
		$db = PearDatabase::getInstance();
		$query="SELECT crmbase_pick FROM vtiger_crmbase_pick";
		$result = $db->query($query);
		for($i=0; $i < $db->num_rows($result); $i++) { 
            $crm = $db->query_result($result, $i, 'crmbase_pick');
			$data[strtolower($crm)] = $crm;
		}
		return $data;
	}

	/**
     * getCrmsBase
     * @author Andrés Velasquez
	 * @param  mixed $server
     * @description Función que consulta los nombres de los servidores
     * @return array
     */
	public function getDNSServer($server) {
		$db = PearDatabase::getInstance();
		$query="SELECT servername FROM vtiger_controlpanel";
		$result = $db->query($query);
		for($i=0; $i < $db->num_rows($result); $i++) { 
            $crm = $db->query_result($result, $i, 'servername');
			$data[strtolower($crm)] = $crm;
		}
		return $data;
	}
	
	/**
	 * getUsage
	 * @author Jonnattan Choque
	 * @param  mixed $crm
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta el uso de un crm
	 * @return array
	 */
	public function getUsage($crm, $startdate, $enddate, $server_sql, $admin = true ) {
		global $dbconfig;
		if($server_sql == '10.187.237.77'){ 			
			$db_name = PREFIXDEMO.$crm; 		
		}else{
			$db_name = PREFIX.$crm;
		}
		$dbconfig['db_server'] = $server_sql;
		$dbconfig['db_name'] = $db_name;
		$adb = new ManagerDB($dbconfig);
		$info = array();
		if($adb->db) {
			$this->adb = &$adb;
            $query = "SELECT COUNT(auditid) AS nauditid
				FROM $db_name.vtiger_audit_trial AS audit 
				WHERE actiondate BETWEEN '$startdate' and '$enddate'";
			if (!$admin) {
				$query .= " AND userid <> 1";
			}
			$nauditid = $this->adb->getOne($query);
			$nauditid = (is_null($nauditid) || empty($nauditid)) ? 0 : $nauditid;
			return $nauditid;
		}else{
            return '0';
        }
	}

	/**
	 * getUsersCount
	 * @author Jonnattan Choque
	 * @param  mixed $crm
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de usuarios
	 * @return int
	 */
	public function getUsersCount($crm, $server_sql,$admin = true) {
		global $dbconfig;
		if($server_sql == '10.187.237.77'){ 			
			$db_name = PREFIXDEMO.$crm; 		
		}else{
			$db_name = PREFIX.$crm;
		}
		$dbconfig['db_server'] = $server_sql;
		$dbconfig['db_name'] = $db_name;
		$adb = new ManagerDB($dbconfig);
		$info = array();
		if($adb->db) {
			$this->adb = &$adb;
			$query = "SELECT count(*) as total FROM vtiger_users WHERE status='active'";
			if (!$admin) {
				$query .= " and id <> 1";
			}
			$total = $this->adb->getOne($query);
		}
		return ($total);
	}

	/**
	 * getRisk
	 * @author Jonnattan Choque
	 * @param  mixed $average
	 * @param  mixed $server_sql
	 * @description Función que calcula el riesgo de un crm en base a su uso
	 * @return string
	 */
	public function getRisk($average, $server_sql) {
		$data = array();
		
		$critical = 'Muy Bajo';//vtranslate('LBL_RISK_CRITICAL', $module);
		$low = 'Bajo';//vtranslate('LBL_RISK_LOW', $module);
		$moderate = 'Alto';//vtranslate('LBL_RISK_ḾODERATE', $module);
		$high = 'Muy Alto';//vtranslate('LBL_RISK_HIGH', $module);

		if($average<=500){
			$risk = $critical;
		}else if($average>=501 && $average<=999){
			$risk = $low;
		}else if($average>=1000 && $average<=1999){
			$risk = $moderate;
		}else{
			$risk = $high;
		}

		return ($risk);
	}

	/**
	 * getUsers
	 * @author Jonnattan Choque
	 * @param  mixed $crm
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta uso, login, nombre y estado de los usuarios de crms
	 * @return array
	 */
	public function getUsers($crm,  $startdate, $enddate, $server_sql){
		global $dbconfig;
		if($server_sql == '10.187.237.77'){ 			
			$db_name = PREFIXDEMO.$crm; 		
		}else{
			$db_name = PREFIX.$crm;
		}
		$dbconfig['db_server'] = $server_sql;
		$dbconfig['db_name'] = $db_name;
		$adb = new ManagerDB($dbconfig);
		$info = array();
		if($adb->db) {
			$this->adb = &$adb;
			$query = "SELECT user_name, CONCAT(last_name,' ',first_name) as name FROM vtiger_users WHERE id <> 1 ORDER BY user_name";
			$result = $adb->query($query);
			$rows = $adb->num_rows($result);
			$all_data = $adb->result_num_rowdata($result, $rows);
			$sumLogin= 0; $sum_activity_crm = 0; $sum_activity_mobile = 0; $sum_status = 0;
			
			foreach ($all_data as $value) {
				$user_name 	= $value['user_name'];
				$name = $value['name'];
				$data['user_name'] = $user_name;
				$data['name'] = $name;
				$data['login'] = $this->getLogin($crm, $user_name, $startdate, $enddate, $server_sql);
				$data['activity_crm'] = $this->getActivityCrm($crm, $user_name, $startdate, $enddate, $server_sql);
				$data['activity_mobile'] = $this->getActivitymobile($crm, $user_name, $startdate, $enddate,$server_sql);
				$data['status'] = $this->getStatus($crm, $user_name, $server_sql);
				
				$sumLogin += $data['login'];
				$sum_activity_crm += $data['activity_crm'];
				$sum_activity_mobile += $data['activity_mobile'];
				array_push($info, $data);
			}
			$data['user_name'] = 'Total';
			$data['name'] = '---';
			$data['login'] = $sumLogin;
			$data['activity_crm'] = $sum_activity_crm;
			$data['activity_mobile'] = $sum_activity_mobile;
			$data['status'] = $sum_status;
			array_push($info,$data);
			return $info;
		}
	}


	/**
	 * getLogin
	 * @author Jonnattan Choque
	 * @param  mixed $user_name
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de logins de un usuario
	 * @return int
	 */
	private function getLogin($crm, $user_name, $startdate, $enddate){
		$sql = "SELECT count(login_id) AS nlogin from vtiger_loginhistory
		where (date(vtiger_loginhistory.login_time) BETWEEN'".$startdate."' and '".$enddate."')
		and vtiger_loginhistory.user_name='".$user_name."' "; 
		$login = $this->adb->getOne($sql);
		$login = (is_null($login) || empty($login)) ? 0 : $login;
		return $login;
	}


	/**
	 * getActivityCrm
	 * @author Jonnattan Choque
	 * @param  mixed $user_name
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un usuario en el crm
	 * @return int
	 */
	private function getActivityCrm($crm, $user_name, $startdate, $enddate){
		$sql = "SELECT count(userid) as actions from vtiger_audit_trial
		inner join vtiger_users on vtiger_users.id=vtiger_audit_trial.userid
		where (date(actiondate) BETWEEN '$startdate' and '$enddate')
		AND mobile=0 AND vtiger_users.user_name='".$user_name."' "; 
		$activityCrm = $this->adb->getOne($sql);
		$activityCrm = (is_null($activityCrm) || empty($activityCrm)) ? 0 : $activityCrm;	
		return $activityCrm;
	}

	/**
	 * getActivitymobile
	 * @author Jonnattan Choque
	 * @param  mixed $user_name
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un usuario en la app
	 * @return int
	 */
	private function getActivitymobile($crm, $user_name, $startdate, $enddate){
		$sql = "SELECT count(userid) as actions from vtiger_audit_trial
		inner join vtiger_users on vtiger_users.id=vtiger_audit_trial.userid
		where (date(actiondate) BETWEEN '$startdate' and '$enddate')
		AND mobile=1 AND vtiger_users.user_name='".$user_name."' "; 
		$activityCrm = $this->adb->getOne($sql);
		$activityCrm = (is_null($activityCrm) || empty($activityCrm)) ? 0 : $activityCrm;
		return $activityCrm;
	}

	/**
	 * getStatus
	 * @author Jonnattan Choque
	 * @param  mixed $user_name
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un usuario en la app
	 * @return string
	 */
	private function getStatus($crm, $user_name, $server_sql){
		$active = $this->adb->getOne("SELECT status FROM vtiger_users WHERE user_name = '".$user_name."'");
		$active = ($active == 'Active') ? 'Activo' : 'Inactivo' ;
		return $active;
	}

	/**
	 * getUseBars
	 * @author Jonnattan Choque
	 * @param  mixed $crm
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un crm 
	 * @return array
	 */
	public function getUseBars($crm, $startdate, $enddate, $server_sql){
		global $dbconfig;
		if($server_sql == '10.187.237.77'){ 			
			$db_name = PREFIXDEMO.$crm; 		
		}else{
			$db_name = PREFIX.$crm;
		}
		$dbconfig['db_server'] = $server_sql;
		$dbconfig['db_name'] = $db_name;
		$adb = new ManagerDB($dbconfig);
		$info = array();
		if($adb->db) {
			$this->adb = &$adb;
			$web = $this->getUseCrm($startdate, $enddate, $server_sql);
			$app = $this->getUseMobile($startdate, $enddate, $server_sql);
		}
			$dataJoin = array($web,$app);
			return $dataJoin;
	}

	/**
	 * getUseCrm
	 * @author Jonnattan Choque
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un crm  en web
	 * @return int
	 */
	private function getUseCrm($startdate, $enddate, $server_sql){
		$sql = "SELECT count(userid) as actions from vtiger_audit_trial
		where (date(actiondate) BETWEEN '$startdate' and '$enddate')
		AND mobile=0 and userid <> 1"; 
		$activityCrm = $this->adb->getOne($sql);
		$activityCrm = (is_null($activityCrm) || empty($activityCrm)) ? 0 : $activityCrm;
		return $activityCrm;
	}

	/**
	 * getUseMobile
	 * @author Jonnattan Choque
	 * @param  mixed $startdate
	 * @param  mixed $enddate
	 * @param  mixed $server_sql
	 * @description Función que consulta la cantidad de uso de un crm  en mobile
	 * @return int
	 */
	private function getUseMobile($startdate, $enddate, $server_sql){
		$sql = "SELECT count(userid) as actions from vtiger_audit_trial
		where (date(actiondate) BETWEEN '$startdate' and '$enddate')
		AND mobile=1 and userid <> 1";
		$activityCrm = $this->adb->getOne($sql);
		$activityCrm = (is_null($activityCrm) || empty($activityCrm)) ? 0 : $activityCrm;
		return $activityCrm;
	}

	/**
	 * getWeeksMonth
	 * @author Jonnattan Choque
	 * @param  mixed $month
	 * @param  mixed $crm
	 * @param  mixed $server_sql
	 * @description Función que consulta el uso mes a mes de los crms
	 * @return array
	 */
	public function getWeeksMonth($month,$crm,$server_sql) {
		$indate = explode('-', date('Y-m-d', strtotime($month)));
		$yy = $indate[0]; $mm = $indate[1]; $dd = $indate[2];
		$lastday = $yy.'-'.$mm.'-'.cal_days_in_month(CAL_GREGORIAN, $mm, $yy);
		$startdate = date('Y-m-d', strtotime(date($yy."-".$mm."-".$dd)));
		$enddate = date('Y-m-d', strtotime($lastday));
		$weeksMonth = array();
		for($date=$startdate, $i=1; $date<=date('Y-m-d', strtotime($lastday." + 6 days")); $date=date('Y-m-d', strtotime($date.' + 7 days')), $i++) {
			$weeksMonth['Semana '.$i] = $this->getWeekDates($date, $startdate, $enddate);
		}
		$data = array();
		$columns = array();
		$uso = 0;
		$totalUso = 0;

		array_push($data,$crm);
		array_push($columns,'crm');

		array_push($data,$this->getUsersCount($crm,$server_sql,false));
		array_push($columns,'users');

		foreach($weeksMonth as $week=>$dates) {
			$sdate = $dates['sdate'];
			$edate = $dates['edate'];
			$sdd = round(explode('-', $sdate)[2]);
			$edd = round(explode('-', $edate)[2]);
			$uso = $this->getUsage($crm,$sdate,$edate,$server_sql);
			$totalUso += $uso;
			array_push($data,$uso);
			array_push($columns,$week.' ('.$sdd.'-'.$edd.')');
		}
		array_push($data,$totalUso);
		array_push($columns,'suma total');

		return ([$data,$columns]);
    }
    
    /**
     * getWeekDates
     * @author Jonnattan Choque
     * @param  mixed $date
     * @param  mixed $startdate
     * @param  mixed $enddate
     * @description Función que divide el mes en las semanas con sus dias exactos
     * @return array
     */
    private function getWeekDates($date, $startdate, $enddate) {
		$sd = explode('-', $date);
		$mm = $sd[1]; $dd = $sd[2];
	    $week =  date('W', strtotime($date));
	    $year =  date('Y', strtotime($date));
	    $from = date("Y-m-d", strtotime("{$year}-W{$week}"));
	    if($from<$startdate) $from = $startdate;
	    $to = date("Y-m-d", strtotime("{$year}-W{$week}-7")); 
	    if($to>$enddate) $to = $enddate;
	    if($mm=='01' && $dd=='01' && ($week=='52' || $week=='53')) {
	    	$week = '01';
	    	$from = $startdate;
	    	$to = date("Y-m-d", strtotime("{$year}-W{$week} - 1 days"));
	    }
	    if($from<=$to){
			$weekdates = array(
		        "sdate" => $from,
		        "edate" => $to
			);
			return $weekdates;
	    }
	}
}
