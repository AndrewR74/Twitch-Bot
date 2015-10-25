<?php
	header("Content-Type: image/png");
	header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");

	if(array_key_exists ( "ID" , $_GET ) && is_numeric($_GET["ID"]))
	{
		$con = new mysqli("localhost","jb0tx10m_pub","!@#$%)(*&^$%^&","jb0tx10m_Twitch");

		if (!mysqli_connect_errno()) {
			$stmt = null;
			$stmt = $con->prepare("select value from TwitchBot_Captchas where ID = ?");

			if($stmt) {
				if($stmt->bind_param("s", $_GET["ID"])) {
					if($stmt->execute()) {

						$stmt->bind_result($CaptchaValue);

						if($stmt->fetch()) {
							$im = @imagecreate(200, 80) or die("Cannot Initialize new GD image stream");

							$background_color = imagecolorallocate($im, 255, 255, 255);

							$text_color = imagecolorallocate($im, 233, 14, 91);

							for($x = 0; $x < strlen($CaptchaValue); $x++) { 
							   imagecopymerge($im, randomRotatedImage($CaptchaValue[$x]), $x * 50, 10, 0, 0, 40, 40, 100);
							}

							for($x = 0; $x < rand(1,3); $x++) {
							   imageline ( $im , rand(15,30), rand(30, 60), rand(175,200), rand(30,60), imagecolorallocate($im, rand(0,255), rand(0,255), rand(0,255)));
							}

							imagepng($im);
							imagedestroy($im);
						}
					} else {
						//echo "Failed Executing";
					}
				} else {
					//echo "Failed binding parameters";
				}
				$stmt->close();
			} else {
				//echo "Failed preparing";
			}
		} else {
			//echo "Error connecting";
		}
		
		mysqli_close($con);
	} else {
		//echo "ID not found";
	}
	
	function randomRotatedImage($character)
	{
		 $im = @imagecreate(40, 40) or die("Cannot Initialize new GD image stream");

		 $background_color = imagecolorallocate($im, 255, 255, 255);

		 imagealphablending($im, false);

		 imagesavealpha($im, true);

		 imagecolortransparent($im, $background_color);

		 $text_color = imagecolorallocate($im, rand(0,255), rand(0,255), rand(0,255));

		 //imagestring($im, 4, 3, 0, getRandomLetter(1), $text_color);

		 imagettftext ($im,20, rand(-30, 30), 11, 30,$text_color,"font.ttf",$character);

		 //$im = imagerotate($im, rand(-30, 30), 0);

		 return $im;
	}
?>