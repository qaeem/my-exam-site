// timer.js
(function () {
	// إذا لم يولَّد endTime في الـ sessionStorage قبل:
	if (!sessionStorage.getItem("endTime")) {
	  let now = new Date().getTime();
	  let endTime = now + 60 * 60 * 1000; // ساعة بالمللي ثانية
	  sessionStorage.setItem("endTime", endTime);
	}
  
	function updateTimer() {
	  const timerElem = document.getElementById("timer");
	  let endTime = parseInt(sessionStorage.getItem("endTime"), 10);
	  let now = new Date().getTime();
	  let distance = endTime - now;
  
	  if (distance <= 0) {
		clearInterval(interval);
		timerElem.textContent = "00:00";
		sessionStorage.setItem("timeUp", "true");
		document.getElementById("submitBtn").disabled = true;
		return;
	  }
  
	  let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
	  let seconds = Math.floor((distance % (1000 * 60)) / 1000);
	  minutes = minutes < 10 ? "0" + minutes : minutes;
	  seconds = seconds < 10 ? "0" + seconds : seconds;
	  timerElem.textContent = minutes + ":" + seconds;
	}
  
	let interval = setInterval(updateTimer, 1000);
	updateTimer();
  })();
  