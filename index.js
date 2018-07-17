(function (){
var request = require('request');

var arrows={Flat:"\u2192",FortyFiveUp:"\u2197",FortyFiveDown:"\u2198",SingleUp:"\u2191",SingleDown:"\u2193",DoubleUp:"\u21C8",DoubleDown:"\u21CA"},tempdate=3589420,isEmpty=false,useMaker=false,usePushover=false,useServer=false,express,cors,app,server,unit,sgvValue,sgvTime,firstResp=true,currRec={sgv:"",trend:0,direction:"",datetime:0,bgdelta:0,battery:""};

var nightscout=(process.env.NIGHTSCOUT)?(process.env.NIGHTSCOUT+""):"";
var makerKey=(process.env.MAKER_KEY)?(process.env.MAKER_KEY+""):"";
var PushoverToken=(process.env.PUSHOVER_TOKEN)?(process.env.PUSHOVER_TOKEN+""):"";
var PushoverUser=(process.env.PUSHOVER_USER)?(process.env.PUSHOVER_USER+""):"";
var webServer=(process.env.WEB_SERVER)?(process.env.WEB_SERVER+""):"";
if(nightscout.length<=5){console.info("NightScout URL not provided!!!");return;/*process.kill(process.pid, 'SIGTERM');*/}
if(makerKey && makerKey.length===43){useMaker=true;}
if(PushoverToken && PushoverUser && PushoverToken.length===30 && PushoverUser.length===30){usePushover=true;}

function serverHandler(){useServer=true;express=require('express');cors=require('cors');app=express();app.use(cors());server=app.listen(process.env.PORT || 3000);console.log("listening on port: "+(process.env.PORT || 3000));
app.all('/',function(req,res){res.contentType("text/html");res.end("Available end-points are: '/json' (with support for JSONP, parameter name is 'callback'), '/xml' and '/rss'")});
app.all('/json',function(req,res){
var rtrn=JSON.parse(JSON.stringify(currRec));
if(rtrn.sgv==""&&rtrn.trend==0&&rtrn.direction==""&&rtrn.datetime==0){rtrn['status']="ERR";} else {rtrn['status']="OK";}
if(req.query.callback){res.contentType("application/javascript");res.end(`${req.query.callback}(${JSON.stringify(rtrn)})`);} else {res.send(rtrn);}
});
app.all('/xml',function(req,res){
var rtrn=JSON.parse(JSON.stringify(currRec));
if(rtrn.sgv==""&&rtrn.trend==0&&rtrn.direction==""&&rtrn.datetime==0){rtrn['status']="ERR";} else {rtrn['status']="OK";}
var xml='<?xml version="1.0" encoding="utf-8"?><item>',ent=Object.entries(rtrn);
for(var i=0,j=ent.length;i<j;i++){xml+=`<${ent[i][0]}>${ent[i][1]}</${ent[i][0]}>`;}xml+='</item>';
res.contentType("text/xml");
res.end(xml);
});
app.all('/rss',function(req,res){
var rtrn=JSON.parse(JSON.stringify(currRec));
if(rtrn.sgv==""&&rtrn.trend==0&&rtrn.direction==""&&rtrn.datetime==0){rtrn['status']="ERR";} else {rtrn['status']="OK";}
var values=Object.values(rtrn),xml=`<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>SGV</title><link>https://www.github.com/PH4NTOMiki</link><description>SGV</description><item><title>${rtrn.sgv} ${arrows[rtrn.direction]} ${rtrn.bgdelta}</title><description>${rtrn.sgv} ${arrows[rtrn.direction]} ${rtrn.bgdelta}</description></item></channel></rss>`;
res.contentType("text/xml");
res.end(xml);
});}

if(webServer && webServer.toLowerCase()=="on"){useServer=true;serverHandler();}
if(!useMaker && !usePushover && !useServer){console.info("Maker, Pushover and Web-Server are all disabled, ACTIVATING JUST WEB-SERVER!!!");useServer=true;serverHandler();}

var timeInterval=5000;/*(process.env.TIME_INTERVAL)?(parseInt(process.env.TIME_INTERVAL)):5000;*/
var lowBg=(process.env.LOW_BG)?(parseFloat(process.env.LOW_BG)):5.6;
var highBg=(process.env.HIGH_BG)?(parseFloat(process.env.HIGH_BG)):10;
startQuery();var intId=setInterval(startQuery,timeInterval);

function errSgv(){
	if (!isEmpty){isEmpty=true;return;
var lastTime=new Date(tempdate);var nowTime=new Date();var minutesAgoTime=(nowTime.getTime()-lastTime.getTime())/(1000*60);
var lastRead=(tempdate==3589420)?"unknown":(Math.floor(minutesAgoTime)+" mins ago");sendPushover("Nightscout: NO READING","ERROR:","NO SGV","Last reading received: "+lastRead);sendMakerRequest("miki-cgmreading","ERROR:","NO SGV","Last reading received: "+lastRead);}
}
 
function startQuery(){console.log("query started");
var url = `https://${nightscout}/pebble`;
    request
      .get(url, (error, response, body) => {if(!response){return;};if(response.statusCode!=200){console.log("error: status code: "+response.statusCode+" != 200");errSgv()} else {
		  var json = JSON.parse(body);if (json.bgs.length==0){console.log("json.bgs.length == 0");errSgv()} else if (json.bgs[0].datetime != tempdate){console.log("json.bgs[0].datetime != tempdate");isEmpty=false;tempdate=json.bgs[0].datetime;handleResp(json);} else {console.log("last query==new query");isEmpty=false;}
	  }});}

function sendMakerRequest(evname,val1,val2,val3){if(!useMaker)return;
var queryStr=[`value1=${(typeof val1=='undefined')?``:encodeURIComponent(val1)}`,`value2=${(typeof val2=='undefined')?``:encodeURIComponent(val2)}`,`value3=${(typeof val3=='undefined')?``:encodeURIComponent(val3)}`].join('&');
var url = `https://maker.ifttt.com/trigger/${evname}/with/key/${makerKey}?${queryStr}`;
    request
      .get(url)
      .on('response', function (response) {
        console.info('sent maker request: ', url);
      })
      .on('error', function (err) {
		console.info('error while sending maker request: '+url+' , '+err);
});}

function sendPushover(evtitle,val1,val2,val3){if(!usePushover)return;
var txt=[`${(typeof val1=='undefined')?``:encodeURIComponent(val1)}`,`${(typeof val2=='undefined')?``:encodeURIComponent(val2)}`,`${(typeof val3=='undefined')?``:encodeURIComponent(val3)}`].join(' '),
formObj={token:PushoverToken,user:PushoverUser,title:evtitle,message:txt},
logTxt=`https://api.pushover.net/1/messages.json data-object: ${JSON.stringify(formObj)}`;
request.post('https://api.pushover.net/1/messages.json', {form:formObj}).on('response',function(response){console.log("sent Pushover request: "+logTxt);}).on('error',function(err){console.log("error while sending Pushover request: "+logTxt+" , "+err);})}

function handleResp(resp){
var rec=resp.bgs[0];currRec=JSON.parse(JSON.stringify(rec));sgvTime=rec.datetime;var recTime=new Date(rec.datetime);var now=new Date();var minutesAgo=(now.getTime()-recTime.getTime())/(1000*60);
var delta=rec.bgdelta+"";if (delta.indexOf("-")===-1){delta="+"+delta}
sgvValue=parseFloat(rec.sgv);
if(firstResp){firstResp=false;if(sgvValue<40){unit="mmol";if(lowBg>=40){lowBg/=18;}if(highBg>=40){highBg/=18;}console.log("unit is mmol");} else {
unit="mgdl";if(lowBg<40){lowBg*=18;}if(highBg<40){highBg*=18;}console.log("unit is mgdl");}}
if(minutesAgo>=0.26){console.log("older than 15.6sec");return;}
var deltaArrow=arrows[rec.direction]+" "+delta;
var minsago=Math.floor(minutesAgo)+" mins ago";
var iob=rec.iob+"u";
sendPushover("Nightscout CGM Reading Received",sgvValue,deltaArrow,iob);
sendMakerRequest("miki-cgmreading",sgvValue,deltaArrow,iob);
if (sgvValue<=lowBg){sendPushover("Nightscout LOW BG: "+sgvValue+" "+deltaArrow,sgvValue,deltaArrow,iob);sendMakerRequest("miki-lowbg",sgvValue,deltaArrow,iob)
} else if (sgvValue>=highBg){sendPushover("Nightscout HIGH BG: "+sgvValue+" "+deltaArrow,sgvValue,deltaArrow,iob);sendMakerRequest("miki-highbg",sgvValue,deltaArrow,iob)}}
 
//function leadZero(m){if(m<10){m="0"+m;}return m;}
//var timenow=new Date(),hr=(timenow.getHours()+2<24)?(timenow.getHours()+2):(timenow.getHours()+2-24),timestart=leadZero(hr)+":"+leadZero(timenow.getMinutes());
})();