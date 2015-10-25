<?php

	$validation = $_POST["connectionKey"]; 
	
	$response = array();
	$response["Code"] = 0;
	$response["Message"] = "";
	
	if($validation == "1337-7456-9074-5638-0010") {
		$con = new mysqli("localhost","jb0tx10m_pub","!@#$%)(*&^$%^&","jb0tx10m_Twitch");

		if (!mysqli_connect_errno())
		{
			$stmtDelete = $con->prepare("delete from TwitchBot_Captchas where ip = ?");
			$stmtInsert = $con->prepare("insert into TwitchBot_Captchas (value, ip) values (?,?)");

			if($stmtDelete && $stmtInsert)
			{
				$captcha = getRandomLetter(4);
				$ip = get_client_ip();
				
				if($stmtDelete->bind_param("s", $ip) && $stmtInsert->bind_param("ss", $captcha, $ip)) {
					if($stmtDelete->execute() && $stmtInsert->execute()) {
						$response["Code"] = 1;
						$response["Message"] = "Successfully Create Captcha";
						$response["Body"] = $con->insert_id;
					} else {
						$response["Message"] = "Failed executing queries.";
					}
				} else {
					$response["Message"] = "Failed binding parameters.";
				}
			} else {
				$response["Message"] = "Failed Preparing Statements.";
			}
		} else {
			$response["Message"] = "Error Connecting To Database.";
		}
	} else {
		$response["Message"] = "POST Request Only.";
	}
	
	echo json_encode($response);
	
	function getRandomLetter($qtd){ 
		//Under the string $Caracteres you write all the characters you want to be used to randomly generate the code. 
		$Caracteres = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVXWYZ0123456789@#$%^&*'; 
		$QuantidadeCaracteres = strlen($Caracteres); 
		$QuantidadeCaracteres--; 

		$Hash = ""; 
		
		for($x=1;$x<=$qtd;$x++){ 
			$Posicao = rand(0,$QuantidadeCaracteres); 
			$Hash .= substr($Caracteres,$Posicao,1); 
		} 

		return $Hash; 
	}
	
	function get_client_ip() {
		$ipaddress = '';
		if ($_SERVER['HTTP_CLIENT_IP'])
			$ipaddress = $_SERVER['HTTP_CLIENT_IP'];
		else if($_SERVER['HTTP_X_FORWARDED_FOR'])
			$ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
		else if($_SERVER['HTTP_X_FORWARDED'])
			$ipaddress = $_SERVER['HTTP_X_FORWARDED'];
		else if($_SERVER['HTTP_FORWARDED_FOR'])
			$ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
		else if($_SERVER['HTTP_FORWARDED'])
			$ipaddress = $_SERVER['HTTP_FORWARDED'];
		else if($_SERVER['REMOTE_ADDR'])
			$ipaddress = $_SERVER['REMOTE_ADDR'];
		else
			$ipaddress = 'UNKNOWN';
		return $ipaddress;
	}

?>