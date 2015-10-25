<?php

	// From the Caller
	$validation = $_POST["connectionKey"]; 
	
	// NewLog || Logs
	$method = $_POST["method"];
	
	// Username for the logs page
	$username = $_POST["username"];
	
	// Whether we have started the session yet
	$sessionStarted = false;
	
	// From the caller
	$DataPartsJSON = $_POST["DataParts"];
	
	$con = new mysqli("localhost","jb0tx10m_pub","!@#$%)(*&^$%^&","jb0tx10m_Twitch");
	//$con=mysqli_connect("localhost","jb0tx10m_pub","!@#$%)(*&^$%^&","jb0tx10m_Twitch");

	$response = array();
	$response["Code"] = 0;
	$response["Message"] = "";
	
	// Handle Get Request
	if(array_key_exists ( "Token" , $_GET )) {

		$DataPartsJSON = explode( "`", $_GET["Token"]);
		
		if(count($DataPartsJSON) == 3)
		{
			$validation = "1337-7456-9074-5638";
			$method = "ActivateUser";
			$DataPartsJSON = json_encode($DataPartsJSON);
		} else {
			$DataPartsJSON = null;
		}
	}
	
	if($DataPartsJSON == null) {
		$DataPartsJSON = "[]";
	}
	
	if($validation == "1337-7456-9074-5638" && $method != "")
	{
		if (mysqli_connect_errno())
		{
			$response["Message"] = "Failed to connect to MySQL: " . mysqli_connect_error();
		}
		else
		{
			$DataParts = json_decode($DataPartsJSON);
			
			//$query = $method == "NewLog" ? "insert into `TwitchBot_Logs` (`Sender`, `Message`, `Channel`) values ('" . $DataParts[0] . "', '" . $DataParts[1] . "', '" . $DataParts[2] . "'" . ")" :
			//"SELECT * FROM	`TwitchBot_Logs` WHERE `Channel` =	 '" . $DataParts[0] . "' ORDER BY ID DESC LIMIT 300";
			
			$stmt = null; 
			
			if($method == "NewLog")
				$stmt = $con->prepare("insert into TwitchBot_Logs (Sender, Message, Channel) values (?, ?, ?)");
			else if($method == "Logs")
				$stmt = $con->prepare("SELECT * FROM TwitchBot_Logs WHERE Channel = ?");
			else if($method == "GetModule")
				$stmt = $con->prepare("SELECT ModuleScript FROM TwitchBot_Modules WHERE ModuleID = ? limit 1");
			else if($method == "GetModuleResources")
				$stmt = $con->prepare("SELECT Resource FROM TwitchBot_Resources WHERE MID = (SELECT ID FROM TwitchBot_Modules WHERE ModuleID = ? limit 1) limit 1");
			else if($method == "RegisterUser")
				$stmt = $con->prepare("call `RegisterUser` (?, ?, ?, ?, ?, ?)");
			else if($method == "ActivateUser")
				$stmt = $con->prepare("call ActivateUser (?, ?)");
			else if($method == "GetAccountModules")
				$stmt = $con->prepare("select ID, ModuleName from TwitchBot_Modules where UserID = ?");
			else if($method == "AccountLogIn")
				$stmt = $con->prepare("select ID, Password, Salt from TwitchBot_Users where lower(Username) = lower(?) and Verified = true");
			else if($method == "AccountLogOut")
				$stmt = true;
			else if($method == "PublishModule")
				$stmt = $con->prepare("call PublishModule (?, ?, ?, ?, ?)");
			
			// 
			//$result = mysqli_query($con, $query);

			if($stmt)
			//if($result)
			{
				if($method == "Logs") {
					if($username == "jbotuser") {
						if($stmt->bind_param("s", $DataParts[0])) {
							if($stmt->execute()) {
								$response["Code"] = 1;
								$response["Message"] = "Success";
								
								$stmt->bind_result($ID, $Sender, $Message, $TimeStamp, $Channel);

								while ($stmt->fetch())
								{
									//while($row = mysqli_fetch_array($result)) {
									$response["Body"] .= "<tr><td>" . $ID . "</td><td>" . $Sender . "</td><td>" . $Message . "</td><td>" . $TimeStamp . "</td></tr>";
								}
							}
						}
					}
				} else if($method == "NewLog") {
					if($username == "jbotlogger") {
						foreach ($DataParts as $value) {
							$parts = json_decode($value);
							if($stmt->bind_param("sss", $parts[0], $parts[1], $parts[2])) {
								if($stmt->execute()) {
									$response["Code"] = 1;
									$response["Message"] = "Logged";
								}
							}
						}
					}
				} else if($method == "GetModule") {
					if($username == "jbotuser") {
						if($stmt->bind_param("s", $DataParts[0])) {
							if($stmt->execute()) {
								$stmt->bind_result($Script);

								while ($stmt->fetch()) {
									$response["Body"] = $Script;
									$response["Code"] = 1;
									$response["Message"] = "Success";
									break;
								}
							}
						}
					}
				} else if($method == "GetModuleResources") {
					if($username == "jbotuser") {
						if($stmt->bind_param("s", $DataParts[0])) {
							if($stmt->execute()) {
								$stmt->bind_result($Resource);

								while ($stmt->fetch()) {
									$response["Body"] = $Resource;
									$response["Code"] = 1;
									$response["Message"] = "Success";
									break;
								}
							}
						}
					}
				} else if($method == "RegisterUser") {
					// 0 - Captcha ID
					// 1 - User Captcha entry
					// 2 - Username
					// 3 - Password
					// 4 - Email
					if($username == "jbotregister") {
						// Verify we have a valid captcha
						$CaptchaIdT = $DataParts[0];
						$CaptchaId = -1;
						$CaptchaUV = $DataParts[1];
						$ruUsername = $DataParts[2];
						$ruSalt = getRandomLetter(20);
						$ruPassword = $DataParts[3];
						$ruEmail = $DataParts[4];
						
						if( strlen($ruUsername) >= 6 && strlen($ruPassword) >= 6 ) {
							$ruPassword = md5($DataParts[3] . $ruSalt);
							if(is_numeric($CaptchaId) && ( $CaptchaId = intval($CaptchaIdT) ) > -1 && $stmt->bind_param("ssssis", $ruUsername, $ruPassword, $ruSalt, $ruEmail, $CaptchaId, $CaptchaUV)) {
								if($stmt->execute()) {
									$stmt->bind_result($ruResult, $ruUserID);
									if($stmt->fetch() && $ruResult == 1) {
										
										SendEmail(
											"Activate your account here: http://jb0t.x10.mx/JBotAPI/TwitchBot_Logs.php?Token=" . urlencode(getRandomLetter(10) . "`" . $ruUserID . "`" . $ruSalt),
											"registration@jb0t.x10.mx",
											$ruEmail,
											"JBot Developer Account Activation"
										);
										
										$response["Body"] = $ruUserID;
										$response["Code"] = 1;
										$response["Message"] = "Success";
									} else {
										//var_dump($stmt->error);
										$response["Message"] = "Failed Fetching Resulted or result was 0";
									}
								} else {
									//var_dump($stmt->error);
									$response["Message"] = "Failed Executing Query";
								}
							} else {
								//var_dump($stmt->error);
								$response["Message"] = "Failed Binding Parameters";
							}
						} else {
							$response["Message"] = "Username & Password are too short.";
						}
					} else {
						$response["Message"] = "Invalid Method Credentials";
					}
				} else if($method == "ActivateUser") {
					// [0] - Random Filler
					$auUserIdT = $DataParts[1];
					$auSalt = $DataParts[2];
					$auUserId = -1;
					
					if(is_numeric($auUserIdT) && ($auUserId = intval($auUserIdT)) > -1 && $stmt->bind_param("is", $auUserId, $auSalt )) {
						if($stmt->execute()) {
							$auResult = 0;
							$stmt->bind_result($auResult);
							
							if($stmt->fetch()) {
								$response["Body"] = "You account has been activated.";
								$response["Code"] = $auResult;
								$response["Message"] = "Success";
							}
						}
					}
				} else if($method == "GetAccountModules") {
					if(!$sessionStarted)
						session_start();
					if(isset($_SESSION['userID'])) {
					
						$gamUserIdT = $DataParts[0];
						$gamUserId = $DataParts[0];
						
						if( is_numeric($gamUserIdT) && ($gamUserId = intval($gamUserIdT)) && intval($_SESSION['userID']) == $gamUserId ) {
							if($stmt->bind_param("i", $gamUserId)) {
								if($stmt->execute()) {
									$stmt->bind_result($moduleId, $moduleName);
									
									$userModules = array();
									
									while ($stmt->fetch()) {
										array_push($userModules, array( "ID" => $moduleId, "Name" => $moduleName ) );
									}
									
									$response["Body"] = $userModules;
									$response["Code"] = 1;
									$response["Message"] = "Success";
								}
							}
						} else {
							$response["Message"] = "User authentication failed";
						}
					} else {
						$response["Message"] = "Session doesn't exist. Log in to your account.";
					}
				} else if($method == "AccountLogIn") {
					if(!$sessionStarted)
						session_start();
					
					if(!isset($_SESSION['userID']) || !isset($_SESSION['userName'])) {
					
						$aliUsername = $DataParts[0];
						$aliPassword = $DataParts[1];
						
						if( strlen($aliUsername) > 0 && strlen($aliPassword) > 0 ) {
							if($stmt->bind_param("s", $aliUsername)) {
								if($stmt->execute()) {
									$stmt->bind_result($id, $saltedPassword, $salt);
									if($stmt->fetch()) {
										
										//$response["Body"] = array( "Salt" => $salt, "SaltedPassword" => $saltedPassword, "Password" => $aliPassword, "GeneratedSaltedPassword" => md5( $aliPassword . $salt ));
										
										if(md5( $aliPassword . $salt ) == $saltedPassword) {
											$_SESSION['userID'] = $id;
											$_SESSION['userName'] = $aliUsername;
											
											$response["Body"] = array("Username" => $_SESSION['userName'], "ID" => $_SESSION['userID'], "SID" => SID);
											$response["Code"] = 1;
											$response["Message"] = "Success";
										} else {
											$response["Message"] = "SaltSum Failed";
										}
									} else {
										$response["Message"] = "Failed Fetching";
									}
								} else {
									 $response["Message"] = "Failed Executing";
								 }
							} else {
								$response["Message"] = "Failing Binding Parameters";
							}
						} else {
							$response["Message"] = "Parameters are invalid";
						}
					} else {
						$response["Body"] = array("Username" => $_SESSION['userName'], "ID" => $_SESSION['userID'], "SID" => SID);
						$response["Code"] = 1;
						$response["Message"] = "Success";
					}
				} else if($method == "AccountLogOut") {
					if(!$sessionStarted)
						session_start();
					session_destroy();
					
					$response["Code"] = 1;
					$response["Message"] = "Success";
				} else if($method == "PublishModule") {
					if(!$sessionStarted)
						session_start();
					if(isset($_SESSION['userID'])) {
					
						// UserID
						// Module Name
						// Module Script
						// Module Resource
												
						$gamUserIdT = $DataParts[0];
						$gamUserId = $DataParts[0];
						
						$ModuleName = $DataParts[1];
						$ModuleScript = hex2bin($DataParts[2]);
						$ModuleResource = hex2bin($DataParts[3]);
						$ModuleID = md5($ModuleName . $gamUserIdT);
						
						if(strlen($ModuleName) <= 100 && strlen($ModuleScript) <= 80000 && strlen($ModuleResource) <= 100000) {
							if( is_numeric($gamUserIdT) && ($gamUserId = intval($gamUserIdT)) && intval($_SESSION['userID']) == $gamUserId ) {
								if($stmt->bind_param("issss", $gamUserId, $ModuleName, $ModuleScript, $ModuleResource, $ModuleID)) {
									if($stmt->execute()) {
										$stmt->bind_result($moduleId, $resultMessage);
										
										if ($stmt->fetch()) {
											$response["Body"] = $moduleId;
											$response["Code"] = 1;
											$response["Message"] = $resultMessage;
										}
									}
								}
							} else {
								$response["Message"] = "User authentication failed";
							}	
						} else {
							$response["Message"] = "Script or Resource is too long. Script can have 80,000 characters. Resource can have 100,000 characters. Minify your script if needed.";
						}
					} else {
						$response["Message"] = "Session doesn't exist. Log in to your account.";
					}
				}
				
			} else {
				$response["Message"] = "MySQL Error: " . mysqli_error($con);
			}
			
			if($stmt != null && !is_bool($stmt))
				$stmt->close();
		}
	}
	else
	{
		$response["Message"] = "Invalid Credentials";
	}
	
	function SendEmail($message, $from, $to, $subject) {

		// In case any of our lines are larger than 70 characters, we should use wordwrap()
		$message = wordwrap($message, 70, "\r\n");
		
		// Send - registration@jb0t.x10.mx
		mail($to, $subject, $message, "From: " . $from);
	}
	
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
	
	mysqli_close($con);

	echo json_encode($response);
?>