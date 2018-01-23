//패키지들 불러오기
const http = require('http');
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var xhr = new XMLHttpRequest(); // xhr을 xmlhttprequest모듈 사용하는거라고 정의를 해줘야함
var xhr2 = new XMLHttpRequest();

//서비스할 포트번호 설정
const port = 4000;

//포트에 접근시 index.html 반환
http.createServer(function(req, res){
	fs.readFile('index.html', function(err, data){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	})
}).listen(port, function(){
	console.log("server is listening on", port);
})

//집회 위치 받아서 저장할 x, y 좌표 (광화문)
var vigilX = 126.976942;
var vigilY = 37.571005;

//집회위치 반경 내 버스정류장 검색
//https://lab.odsay.com/guide/reference#pointSearch 참조
var urlStr = "https://api.odsay.com/api/pointSearch?Lang=0"
//위의 url에 아래 요소들 붙여서 API 조회할 url을 만든다
urlStr += "&x=" + vigilX;
urlStr += "&y=" + vigilY;
urlStr += "&radius=" + 300; //집회위치 반경 몇m나 조회? (300으로 셋팅)
urlStr += "&stationClass=1" //1번이 버스정류장, 2번이 지하철역...
urlStr += "&apiKey=" + "GnSmCmPIkjKL9/FV99w4kZkJMcq1Jkc01VwirnkkSnY"
//odsay 앱키 (IP별로 1개씩 따로 발급되더라ㅠ : 그대로 하시면 API 조회할 때 오류날 듯, 따로발급하셔야...)

//아래는 https://lab.odsay.com/guide/guide?platform=web 오디세이 개발가이드 샘플코드
xhr.open("GET", urlStr, true);
	xhr.send();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) { // 응답 성공시
			console.log( xhr.responseText ); // <- xhr.responseText : 파싱안한 날것의 XML데이터를 콘솔에 찍어주는듯

			//여기에 이제
			//1. 받은 데이터에서 버스정류장 코드만 따서
			//2. 그 버스정류장 코드를 포함해서 무슨버스지나가나 API 조회를 하고
			//3. 응답받은 버스노선들 적당히 추리고 데이터 가공해서
			//4. 지도에 뿌린다?

			//...너무많네
		}
	};

//돌발정보 받아오기 : 그냥 버스정류장 검색할때 쓴 코드에서 url만 바꿔서 해봄
//서울시열린데이터광장 돌발정보 API : http://data.seoul.go.kr/dataList/datasetView.do?infId=OA-13315&srvType=A&serviceKind=1&currentPageNo=1
var accUrl = "http://openapi.seoul.go.kr:8088"
accUrl += "/" + "*****API_KEY*****" //data.seoul.go.kr 앱키
accUrl += "/xml/AccInfo/1/5" //AccInfo는 API이름, 1/5는 페이지 시작-끝 번호

xhr2.open("GET", accUrl, true);
	xhr2.send();
	xhr2.onreadystatechange = function() {
		if (xhr2.readyState == 4 && xhr2.status == 200) { // 응답 성공시
			console.log( xhr2.responseText ); // <- xhr.responseText : 파싱안한 날것의 XML데이터를 콘솔에 찍어주는듯
		}
	};


//xhr이 뭐 어찌 돌아가는지는 잘 모르겠지만 돌리면 아무튼 TEST폴더에 올려놓은 사진처럼 잘 됨...ㅋㅋ
//index.html 보려면 app.js 실행중인 상태에서 브라우저에 localhost:4000 입력
