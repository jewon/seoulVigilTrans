//패키지들 불러오기
const http = require('http');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var xhr = new XMLHttpRequest(); // xhr을 xmlhttprequest모듈 사용하는거라고 정의를 해줘야함
var xhr2 = new XMLHttpRequest();
var xhr3 = new XMLHttpRequest();


//서비스할 포트번호 설정
const port = 4000;

//웹에 접근 > 집회정보 검색 > 집회위치 추출해 index.html에 넘겨주기 > index.html내의 구글맵에 마커로 표현?
//or 주기적으로 집회정보 검색해서 지도 생성에 필요한 인자 모두 저장 및 업데이트 해둠 > 웹에 접근시 지도 표현?

//포트에 접근시 index.html 반환
http.createServer(function(req, res){
	fs.readFile('index.html', function(err, data){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	})
}).listen(port, function(){
	console.log("server is listening on", port);
})

//집회 위치 받아서 저장할 x, y 좌표(WGS84) : 추후 vigilX_tm, vigilY_tm을 변환할 필요
var vigilX = 126.976942;
var vigilY = 37.571005; //초깃값 : 세종대로사거리

//집회 위치 받아서 저장할 x, y 좌표(GRS80TM) : 서울시에서 받아서 바로 저장, 이후 변환필요
var vigilX_tm;
var vigilY_tm;

//돌발정보 받아오기 : 그냥 버스정류장 검색할때 쓴 코드에서 url만 바꿔서 해봄
//서울시열린데이터광장 돌발정보 API : http://data.seoul.go.kr/dataList/datasetView.do?infId=OA-13315&srvType=A&serviceKind=1&currentPageNo=1
var accUrl = "http://openapi.seoul.go.kr:8088"
accUrl += "/" + "6f5548484b6a657734364372496f46" //data.seoul.go.kr 앱키
accUrl += "/xml/AccInfo/1/5" //AccInfo는 API이름, 1/5는 페이지 시작-끝 번호, API가 json미지원(xml만 가능)

xhr2.open("GET", accUrl, true);
xhr2.send();
xhr2.onreadystatechange = function() {
	if (xhr2.readyState == 4 && xhr2.status == 200) { // 응답 성공시

		//console.log( xhr2.responseText ); // <- xhr.responseText : 파싱안한 날것의 XML데이터를 콘솔에 찍어주는듯

			/* xhr2.responseTest 예시 (XML) :
			<?xml version="1.0" encoding="UTF-8" standalone="yes"?><AccInfo><list_total_count>1</list_total_count>
			<RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다</MESSAGE></RESULT><row><acc_id>593894</acc_id>
			<occr_date>20140106</occr_date><occr_time>0000</occr_time><exp_clr_date>20181231</exp_clr_date>
			<exp_clr_time>230000</exp_clr_time><acc_type>A11</acc_type><acc_dtype>11B01</acc_dtype>
			<link_id>1130017700</link_id><grs80tm_x>194423.5962627257</grs80tm_x><grs80tm_y>450897.9580961145</grs80tm_y>
			<acc_info>- 버스, 16인 승 이상 승합차, 긴급차량, 자전거만 통행 허용&#13;- 조업차량 ( 10시~11시,15시~16시 ),
			택시 ( 00시~04시 )&#13;- 주말'차 없는 거리’운영 : 매주 토요일 14시~일요일 22시&#13;- 사전 신고된 차량만 제한적 허용 &#13;</acc_info></row></AccInfo>
			*/


		//XML 파싱
		var accXML = xhr2.responseText;
		var accJS;
		parseString(accXML, function (err, result) {
  			accJS = result;
				//console.log(JSON.stringify(result)) //JSON객체 콘솔에 찍어봄
		});

		//일단 첫 번째 돌발정보만 처리해보자
		var accn = accJS.AccInfo.list_total_count;
		console.log("ACC Count : " + accn); //돌발정보 갯수
		vigilX_tm = accJS.AccInfo.row[0].grs80tm_x;
		vigilY_tm = accJS.AccInfo.row[0].grs80tm_y;
		//집회가 일어난 장소의 좌표를 저장함
		//얘는 grs80타원체 TM좌표계 (아마도 중부원점) 사용

		//구글맵이랑 뒤에서 쓰는 오디세이 API는 또 WGS84좌표값만 받음.
		//즉, 돌발정보API에서 얻은 좌표를 변환해줘야 함
		//근데 이걸 바꾸는 게 무슨 공식이 있어서 딱 쉽게 되는 게 아니라 매우 복잡합
		//따라서, 돌발정보API에서 받은 tm좌표를 WGS84경위도 좌표로 바꾸어주어야 함
		//좌표계 변환하는 건 Kakao맵 API가 가장 간단한 듯 해 사용해 보았음
		kakaoUrl = "https://dapi.kakao.com/v2/local/geo/transcoord.json?";
		kakaoUrl += "x=" + vigilX_tm;
		kakaoUrl += "&y=" + vigilY_tm;
		kakaoUrl += "&input_coord=TM&output_coord=WGS84"//TM입력 WGS84출력

		xhr3.open("GET", kakaoUrl);
		xhr3.setRequestHeader('Authorization', "KakaoAK 73fd9facc7ef24e2aaad8f389c2b0f4d");
		xhr3.withCredentials = true;
		xhr3.send();
		xhr3.onreadystatechange = function() {
			if (xhr3.readyState == 4 && xhr3.status == 200) { // 응답 성공시
				//console.log( xhr3.responseText );
				/*응답 예시 :
				{"meta":{"total_count":1},"documents":[{"x":126.93767455540775,"y":37.560342105446274}]}
				*/

				var vigilXY = JSON.parse(xhr3.responseText);
				console.log(vigilXY);
				vigilX = vigilXY.documents[0].x;
				vigilY = vigilXY.documents[0].y;
				console.log( "CSR Change OK (FROM KAKAO API) : ", vigilX, ", ", vigilY);

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

							/* 응답 예시 :
							{"result":{"count":18,"station":[{"nonstopStation":0,"stationClass":1,"stationName":"광화문한국통신.KT","stationID":196616,"x":126.977356,"y":37.571873,"arsID":"","ebid":""}]}}
							*/

							//파싱해서 nearstop이라는 변수에 우선 저장해둔다
							var nearstop = JSON.parse(xhr.responseText);

							//여기에 이제
							//1. 받은 데이터에서 버스정류장 코드만 따서
							//2. 그 버스정류장 코드를 포함해서 무슨버스지나가나 API 조회를 하고
							//3. 응답받은 버스노선들 적당히 추리고 데이터 가공해서
							//4. 지도에 뿌린다?

							//...너무많네
						}
					};//여기까지 집회반경버스정류장 검색
			}
			else {
				console.log( xhr3.status );
			}
		};
		//여까지 좌표변환
	}
};//여기까지 돌발정보조히


/*
전체적으로 구조가 이렇습니다.

돌발정보조회(서울시){
	성공시: 받은좌표 변환(카카오){
		성공시: 변환된 좌표로 주변버스정류장 검색(오디세이){
	}
}
*/

//xhr이 뭐 어찌 돌아가는지는 잘 모르겠지만 돌리면 아무튼 TEST폴더에 올려놓은 사진처럼 잘 됨...ㅋㅋ
//index.html 보려면 app.js 실행중인 상태에서 브라우저에 localhost:4000 입력
