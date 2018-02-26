//패키지들 불러오기
const http = require('http');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const express = require('express');

//API_KEY 담아두는 파일 로드 (루트 디렉터리)
var key = require('./appkey.js') //기본으로 node_modules폴더를 잡기 때문에 한 단계 상위 디렉토리로 가야 루트임

var xhr = new XMLHttpRequest(); // xhr을 xmlhttprequest모듈 사용하는거라고 정의를 해줘야함
var xhr2 = new XMLHttpRequest();
var xhr3 = new XMLHttpRequest();
var xhr4 = new XMLHttpRequest();

var app = express();
app.set('views');
app.set('view engine', 'ejs');
//express엔진 템플릿을 ejs로 설정

//서비스할 포트번호 설정
const port = 4000;

//웹에 접근 > 집회정보 검색 > 집회위치 추출해 index.html에 넘겨주기 > index.html내의 구글맵에 마커로 표현?
//or 주기적으로 집회정보 검색해서 지도 생성에 필요한 인자 모두 저장 및 업데이트 해둠 > 웹에 접근시 지도 표현?


/*
//포트에 접근시 index.html 반환
http.createServer(function(req, res){
	fs.readFile('index.html', function(err, data){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	})
}).listen(port, function(){
	console.log("server is listening on", port);
})
*/
//기본 내장 http 모듈 대신 express 사용 (코드 아래부분에 넣음)


//집회 위치 받아서 저장할 x, y 좌표(WGS84) : 추후 vigilX_tm, vigilY_tm을 변환해서 여기에 저장
var vigilX = 126.976942;
var vigilY = 37.571005; //초깃값 : 세종대로사거리

//집회 위치에서 버스 정류장 검색할 반경 설정
var radius = 500;

//집회 위치 받아서 저장할 x, y 좌표(GRS80TM) : 서울시에서 받아서 바로 저장, 이후 변환필요
var vigilX_tm;
var vigilY_tm;

//집회에 영향받는 버스들 목록 넘겨줄 스트링
var vigilBusNumbersString = "";

//집회지 주변 버스정류장 저장할 JSON
var nearstopGeoJSON = { "type" : "FeatureCollection", "features" : [] };

//돌발정보 받아오기 : 그냥 버스정류장 검색할때 쓴 코드에서 url만 바꿔서 해봄
//서울시열린데이터광장 돌발정보 API : http://data.seoul.go.kr/dataList/datasetView.do?infId=OA-13315&srvType=A&serviceKind=1&currentPageNo=1
var accUrl = "http://openapi.seoul.go.kr:8088"
accUrl += "/" + key.seoulD //data.seoul.go.kr 앱키
accUrl += "/xml/AccInfo/1/100" //AccInfo는 API이름, 1부터 100번째 돌발정보까지 가져옴, API가 json미지원(xml만 가능)

xhr2.open("GET", accUrl, true);
xhr2.send();
xhr2.onreadystatechange = function() {
	if (xhr2.readyState == 4 && xhr2.status == 200) { // 응답 성공시 (xhr.readyState : https://developer.mozilla.org/ko/docs/Web/API/XMLHttpRequest/readyState 참조)

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

			/*
			위의 응답결과에서 집회정보만 추려야하는데 acc_type이 아마 돌발정보 유형인 듯 한데...
			이 코드가 뭘 의미하는지에 대한 정보가 없어서 찾아보니 이것도 API로 받아와야 하더라...
			http://openapi.seoul.go.kr:8088/(서울열린데이터광장 API키)/xml/AccMainCode/1/100/ 로 GET해보면

			<?xml version="1.0" encoding="UTF-8" standalone="yes"?><AccMainCode><list_total_count>12</list_total_count><RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다</MESSAGE></RESULT><row><acc_type>A01</acc_type><acc_type_nm>교통사고</acc_type_nm></row><row><acc_type>A02</acc_type><acc_type_nm>차량고장</acc_type_nm></row><row><acc_type>A03</acc_type><acc_type_nm>보행사고</acc_type_nm></row><row><acc_type>A04</acc_type><acc_type_nm>공사</acc_type_nm></row><row><acc_type>A05</acc_type><acc_type_nm>낙하물</acc_type_nm></row><row><acc_type>A06</acc_type><acc_type_nm>버스사고</acc_type_nm></row><row><acc_type>A07</acc_type><acc_type_nm>지하철사고</acc_type_nm></row><row><acc_type>A08</acc_type><acc_type_nm>화재</acc_type_nm></row><row><acc_type>A09</acc_type><acc_type_nm>기상/재난</acc_type_nm></row><row><acc_type>A10</acc_type><acc_type_nm>집회및행사</acc_type_nm></row><row><acc_type>A11</acc_type><acc_type_nm>기타</acc_type_nm></row><row><acc_type>A12</acc_type><acc_type_nm>제보</acc_type_nm></row></AccMainCode>

			acc_type이 A10이면 '집회및행사' 라고한다. 이게 추후에 계속 변동하는지는 두고 봐야할듯
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
		vigilI = accJS.AccInfo.row[0].acc_info;
		//집회가 일어난 장소의 좌표를 저장함
		//얘는 grs80타원체 TM좌표계 (아마도 중부원점) 사용


		//돌발정보 중 집회및행사에 대한 것만 추려보자
		var vigilN = 0; //집회 갯수를 저장할 변수 (0이면 이후 동작을 하지 않게 설정)
		var nonvigilN = 0;
		var vigilObj = { vigil : [], nonvigil : [] };
		//집회와 아닌 것 구분하는 오브젝트(집회가 하도 없어서 둘다 담음, 추후 집회만 담도록 변경)

		for ( var i = 0; i < accJS.AccInfo.row.length; i++) {
			if (accJS.AccInfo.row[i].acc_type == 'A10') {
				console.log("ACC " + i + "is Vigil ACC! : " + accJS.AccInfo.row[i].acc_info);
				vigilObj.vigil[vigilN] = accJS.AccInfo.row[i];
				vigilN++;
			}
			else {
				console.log("ACC " + i + "is Not Vigil ACC : " + accJS.AccInfo.row[i].acc_type);
				vigilObj.nonvigil[nonvigilN] = accJS.AccInfo.row[i];
				nonvigilN++;
			}
		}


		//구글맵이랑 뒤에서 쓰는 오디세이 API는 또 WGS84좌표값만 받음.
		//즉, 돌발정보API에서 얻은 좌표를 변환해줘야 함
		//근데 이걸 바꾸는 게 무슨 공식이 있어서 딱 쉽게 되는 게 아니라 매우 복잡합
		//따라서, 돌발정보API에서 받은 tm좌표를 WGS84경위도 좌표로 바꾸어주어야 함
		//좌표계 변환하는 건 Kakao맵 API가 가장 간단한 듯 해 사용해 보았음
		kakaoUrl = "https://dapi.kakao.com/v2/local/geo/transcoord.json?";
		kakaoUrl += "x=" + vigilX_tm;
		kakaoUrl += "&y=" + vigilY_tm;
		kakaoUrl += "&input_coord=WTM&output_coord=WGS84"//TM입력 WGS84출력

		xhr3.open("GET", kakaoUrl);
		xhr3.setRequestHeader('Authorization', key.kakao);
		xhr3.withCredentials = true;
		xhr3.send();
		xhr3.onreadystatechange = function() {
			if (xhr3.readyState == 4 && xhr3.status == 200) { // 응답 성공시
				//console.log( xhr3.responseText );
				/*응답 예시 :
				{"meta":{"total_count":1},"documents":[{"x":126.93767455540775,"y":37.560342105446274}]}
				*/

				var vigilXY = JSON.parse(xhr3.responseText);
				//console.log(vigilXY);
				vigilX = vigilXY.documents[0].x;
				vigilY = vigilXY.documents[0].y;
				console.log( "CSR Change OK (FROM KAKAO API) : ", vigilX_tm, ", ", vigilY_tm, " -> ", vigilX, ", ", vigilY);

				//집회위치 반경 내 버스정류장 검색
				//https://lab.odsay.com/guide/reference#pointSearch 참조
				var urlStr = "https://api.odsay.com/api/pointSearch?Lang=0"
				//위의 url에 아래 요소들 붙여서 API 조회할 url을 만든다
				urlStr += "&x=" + vigilX;
				urlStr += "&y=" + vigilY;
				urlStr += "&radius=" + radius; //집회위치 반경 몇m나 조회? (200으로 셋팅)
				urlStr += "&stationClass=1"; //1번이 버스정류장, 2번이 지하철역...
				urlStr += "&apiKey=" + key.odsay;
				//odsay 앱키 (IP별로 1개씩 따로 발급되더라ㅠ : 그대로 하시면 API 조회할 때 오류날 듯, 따로발급하셔야...)

				//아래는 https://lab.odsay.com/guide/guide?platform=web 오디세이 개발가이드 샘플코드
				xhr.open("GET", urlStr, true);
				xhr.send();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) { // 응답 성공시
						//console.log( xhr.responseText ); // <- xhr.responseText : 파싱안한 날것의 XML데이터를 콘솔에 찍어주는듯

						/* 응답 예시 :
						{"result":{"count":18,"station":[{"nonstopStation":0,"stationClass":1,"stationName":"광화문한국통신.KT","stationID":196616,"x":126.977356,"y":37.571873,"arsID":"","ebid":""}]}}
						*/

						//파싱해서 nearstop이라는 변수에 우선 저장해둔다
						var nearstop = JSON.parse(xhr.responseText);
						console.log('nearbusstops : ' + nearstop.result.count);
						if (nearstop.result.count > 0) { //주변에 버정이 있는경우에만 계속 진행

							//버스정류장 정보들을 geoJSON 표준으로 바꿔주는 코드
							for (var i = 0; i < nearstop.result.count; i++) { //버스정류장 갯수만큼 반복해서 geoJSON Feature에 Push해서 배열 추가
								var tempF = { "type" : "Feature" , "properties" : { "bus" : [] , "name" : "" } , "geometry" : { "type" : "Point", "coordinates" : [] }, "id" : "" }
								tempF.id = nearstop.result.station[i].stationID;
								tempF.properties.name = nearstop.result.station[i].stationName;
								tempF.geometry.coordinates.push(nearstop.result.station[i].x);
								tempF.geometry.coordinates.push(nearstop.result.station[i].y);
								nearstopGeoJSON.features.push(tempF);
							}

							//정류장 코드만 따본다 우선 가장 첫 번째 정류장만 해보자
							var nearstopcode = nearstop.result.station[0].stationID;

							//버스정류장 코드로 그 정류장 지나가는 버스 노선 검색하기 (오딧세이 API)
							//https://lab.odsay.com/guide/releaseReference#busStationInfo 참조
							var busUrl = "https://api.odsay.com/v1/api/busStationInfo"
							//위의 URL에 아래 요소들 붙여서 API 조회할 URL 만든다.
							busUrl += "?lang=0";
							busUrl += "&stationID=" + nearstopcode;
							busUrl += "&apiKey=" + key.odsay;

							xhr4.open("GET", busUrl, true);
							xhr4.send();
							xhr4.onreadystatechange = function() {
								if (xhr4.readyState == 4 && xhr4.status == 200) { // 응답 성공시
									//console.log( xhr4.responseText ); // <- xhr.responseText : 파싱안한 날것의 XML데이터를 콘솔에 찍어주는듯

									/* 응답 예시 (지나가는 버스들의 모든 정보들이 다튀어나와서 매우 길다...) :
									{"result":{"stationName":"세브란스병원앞","stationID":103744,"x":126.93827945025708,"y":37.56000206509544,"localStationID":"112000014","arsID":"13-014",
									"do":"서울특별시","gu":"서대문구","dong":"신촌동","lane":[{"busNo":"710","type":11,"busID":895,"busStartPoint":"상암차고지","busEndPoint":"수유역.강북구청",
									"busFirstTime":"03:50","busLastTime":"22:40","busInterval":"8","busCityCode":1000,"busCityName":"서울","busLocalBlID":"100100110"},
									{"busNo":"272","type":11,"busID":990,"busStartPoint":"면목동","busEndPoint":"남가좌동","busFirstTime":"04:15","busLastTime":"22:30","busInterval":"4",
									"busCityCode":1000,"busCityName":"서울","busLocalBlID":"100100048"}
									*/

									//vigilBuses라는 변수에 파싱에서 우선 저장해둠
									var vigilBuses = JSON.parse(xhr4.responseText);
									for ( var i = 0; i < vigilBuses.result.lane.length; i++) {
										vigilBusNumbersString += vigilBuses.result.lane[i].busNo += " ";
									}

									console.log("Acc Affected Buses : " + vigilBusNumbersString);

									//여기에 이제
									//1. 받은 데이터에서 버스정류장 코드만 따서 : 했음
									//2. 그 버스정류장 코드를 포함해서 무슨버스지나가나 API 조회를 하고 : 했음
									//3. 응답받은 버스노선들 적당히 추리고 데이터 가공해서 : 넘나 어려운 것
									//4. 지도에 뿌린다? : ejs 엔진 필요 (노드에서 HTML페이지로 인자 넘기기 위해 동적 HTML 사용해야함)

									//...너무많네

								}
								else{
									console.log( "Odsay busStationInfo API Err : " + xhr4.status + "   readystate : " + xhr4.readyState );
								}
							};//여기까지 버스정류장코드로 지나가는 버스 검색
						}//(주변 버스장이 있을 경우에만 if문)
					}
					else {
						console.log( "Odsay busstop search Err : " + xhr.status + "   readystate : " + xhr.readyState );
					}
				};//여기까지 집회반경버스정류장 검색
			}
			else {
				console.log( "Naver API CSR change Err : " + xhr3.status + "   readystate : " + xhr3.readyState );
			}
		};//여까지 좌표변환
	}
	else {
		console.log( "Seoul City ACCinfo API Err : " + xhr2.status + "   readystate : " + xhr2.readyState );
	}
};//여기까지 돌발정보조회

/*
전체적으로 구조가 이렇습니다.

돌발정보조회(서울시){
	성공시: 받은좌표 변환(카카오){
		성공시: 변환된 좌표로 주변버스정류장 검색(오디세이){
			성공시: 검색한 버스정류장코드로 지나가는 버스 조회(오디세이)
	}
}

이걸 한번에 하는 게 아니라 좀 더 인터액티브(?)한 방법을 생각하려고 보니...
일단 페이지 접근하면 돌발정보조회(서울시) > 좌표변환(카카오) > 해당 지점 반경 ~m 내의 버스정류장 검색(오디세이)
이렇게 다양한 돌발정보들의 위치와 주변 반경 ~m내의 버스정류장의 위치를 구글맵의 pin으로 띄워준 다음에
사용자가 버스정류장을 클릭하면 그곳을 지나는 버스 목록을 오디세이에서 조회하는 방법이 나은 것 같다.

get('/', fucntion(req, res) {
	돌발정보조회(서울시){
		성공시: 받은좌표 변환(카카오){
			성공시: 변환된 좌표로 주변버스정류장 검색(오디세이)
		}
	}
}

*/

//xhr이 뭐 어찌 돌아가는지는 잘 모르겠지만 돌리면 아무튼 TEST폴더에 올려놓은 사진처럼 잘 됨...ㅋㅋ
//index.html 보려면 app.js 실행중인 상태에서 브라우저에 localhost:4000 입력

/*
//동적 HTML 구현을 위한 express 프레임워크로 전환해봄
app.get('/', function (req, res) {
	fs.readFile('index.html', function(err, data){
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	});
});//루트디렉터리에 접근하면 index.html 반환 : 이건 정적 HTML을 express로 다루는 방법입니다.
*/


app.get('/', function(req, res){
  res.render("index", { gappkey : key.google, vigilX : vigilX, vigilY : vigilY, vigilI : vigilI, vigilBus : vigilBusNumbersString, radius : radius, nearstop : JSON.stringify(nearstopGeoJSON)})
});//루트디렉터리에 접근하면 index.ejs라는 파일을 찾아 뒤의 파라미터를 찾아 html로 렌더링해서 반환함 (동적) : 기본적으로 views 폴더 안의 파일을 찾음


app.get('/bus-icon', function(req, res){
	fs.readFile('bus.gif', function(err, data){
		res.writeHead(200, { 'Content-Type' : 'text/html' })
		res.end(data);
	});
});

app.listen(port, function () {
  console.log('listening on port' + port);
});//4000번 포트 리스닝
