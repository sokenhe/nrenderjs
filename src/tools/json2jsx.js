var _ = require("underscore");
var fs = require('fs');
var process = require('process');
var url = require('url');  
var http = require('http')

function main(tpl,mag){
var MePageT = _.template('<MePage idx={<%= idx %>} cxt={cxt} normalStyle={{height:"<%= page_height%>px",width:"<%= page_width%>px"}} >\n<%= children%>\n</MePage>');
var NoTypeDefinedT = _.template('<div cxt={cxt} style={{<%= style%>}}> No Such Type defined <%= item_type %></div>');
var posStyleTemplate = _.template('top:"<%= item_top%>px",left:"<%= item_left%>px",zIndex:<%= item_layer%>,position:"absolute"');
var sizeStyleTemplate = _.template('height:"<%= item_height%>px",width:"<%= item_width%>px"');
var fontStyleTemplate = _.template('fontSize:"<%= font_size%>", color:"<%= item_color%>",fontFamily:"<%= font_family %>"');
var imgTemplate = _.template('<MeImage src="<%= src%>" displayType = {<%= displayType%>} normalStyle={{<%= style %>}}></MeImage>');
var grpTemplate = _.template('<MeDiv displayType = {<%= displayType%>} pageIdx={<%= pageIdx %>} cxt={cxt} id="<%= id%>" normalStyle={{<%= style %>}}><%= children%></MeDiv>');
var divTemplate = _.template('<div style={{<%= style %>}}><%= content%></div>')
var animationTemplate = _.template('<MeAnimation displayType = {<%= displayType%>} pageIdx={<%= pageIdx %>} cxt={cxt} animationClass={<%= animationClass%>} animation={<%= animation%>} normalStyle={{<%= normalStyle%>}}><%= children %></MeAnimation>');
var touchTriggerTemplate = _.template('<MeTouchTrigger pageIdx={<%= pageIdx %>} cxt={cxt} id="<%= id%>" normalStyle={{<%= normalStyle%>}} triggerActions={{"<%= triggerActions.evt %>":<%= triggerActions.cmds %>}}><%= children %></MeTouchTrigger>');


var itemFuncMap = {
	"1":		imgRenderItem,
	"2":		textRenderItem,
	"3":		imgRenderItem,
	"10":		imgRenderItem,
	"18":		imgRenderItem,
	"17":		grpRenderItem,
	"34":		grpRenderItem,
};

var gId = 0;

var defaultAnimation = 	'{animationIterationCount:"1",animationDelay:"0s",animationDuration:"1s"}';
	var index = [];
	index.push(-1);
	var pageContent = [];
	if(mag.groups == undefined){
		mag.groups = [{
			pages:mag.pages
		}];
	}
	var pageNum = 0;
	for(grpIdx = 0;grpIdx < mag.groups.length; grpIdx ++){
		var pages = mag.groups[grpIdx].pages;
		for(var i = 0;i < pages.length;i ++){
			pages[i].idx = i + pageNum;
			pageContent.push(renderPage(pages[i]));
			index.push(i+pageNum);
		}
		pageNum += pages.length;
	}
	index.push(-1);
	return (_.template(tpl))({pages:pageContent.join(","),layout:index.toString(),music_src:mag.tpl_music});
function renderPage(page){
	var items = [];
	var grps = indexItems(page.item_object);
	
	_.each(grps,function(grp,key){
		var newGrps = []
		_.each(grp.items,function(item,idx){
			newGrps.push(renderItem(page,item));
		});
		if(grp.owner != null){
			grpDiv = renderItem(page,grp.owner,newGrps);
			items.push(grpDiv);
		}else{
			items = items.concat(newGrps);
		}
	});
	page.children = items.join("\n");
	
	return (MePageT(page) + "\n");
}

function indexItems(items){
	var grps = {};
	grps["0"] = {
				items:[],
				owner:null
			}
	for(var i = 0; i < items.length;i ++){
		if(items[i].group_id == undefined) items[i].group_id = "0";
		if(grps.hasOwnProperty(items[i].group_id)){
			if((items[i].item_id == items[i].group_id) || items[i].item_type == 17 || items[i] == 34 ){
				grps[items[i].group_id].owner = items[i];
			}
			else grps[items[i].group_id].items.push(items[i]);
		}else{
			grps[items[i].group_id] = {
				items:[],
				owner:null
			}
			if(items[i].item_id == items[i].group_id || items[i].item_type == 17 || items[i] == 34)
				grps[items[i].group_id].owner = items[i];
			else grps[items[i].group_id].items.push(items[i]);
		}
	}
	return grps;
}
function noTypeDefined(page,item){
	var _style = [posStyleTemplate(item),sizeStyleTemplate(item)];
	return NoTypeDefinedT({item_type:item.item_type,style:_style});
}

function renderTransform(item){
	/**scale 的处理交给转换程序，将scale，修改hieght,和width
	var scale = "";
	if(item.x_scale != null && item.x_scale != 1 ){
		scale = "scale3d(" +item.x_scale;
	}
	if(item.y_scale != null && item.y_scale != 1 ){
		if(scale == "") scale =  "scale3d(1";
		scale = scale + "," + item.y_scale + ",1)";
	}else{
		if(scale != "") scale = scale + ",1,1)";
	}*/
	//if(scale == "") return "";
	//return 'transform:"' + scale + '"';
	return "";
}

function imgRenderItem(page,item,_style){
	//人工实现Scale,
	if(item.x_scale == null) item.x_scale = 1;
	if(item.y_scale == null) item.y_scale = 1;
	item.item_height *= item.y_scale;
	item.item_width *= item.x_scale;	//激进一点，然返回的图片小一些
	if(item.item_val.search(/imageView2/) == -1){
		item.item_val = item.item_val + "?imageView2/2/w/"+Math.floor(item.item_width) + "/h/" + Math.floor(item.item_height);
	}
	
	_style.push(sizeStyleTemplate(item));
	return imgTemplate({src:item.item_val,displayType:item.item_display_status,style:_style.join(",")});
}

function textRenderItem(page,item,_style){
	var tem = renderTransform(item);
	if(tem != "")
		_style.push(tem);
	if((item.item_width != undefined && item.item_width) != 0 || (item.item_height != undefined && item.item_height != 0)) _style.push(sizeStyleTemplate(item));	
	
	_style.push(fontStyleTemplate(item));
	//防止react错误，对{}进行替换
	item.item_val = item.item_val.replace(/[{|}]/g,function(word){
												return "{'" + word + "'}"
											});
	return divTemplate({content:item.item_val,displayType:item.item_display_status,style:_style.join(",")});
}

function grpRenderItem(page,item,_style,content){
	var tem = renderTransform(item);
	if(tem != "")
		_style.push(tem);
	_style.push(sizeStyleTemplate(item));	
	_style.push('overflow:"hidden"');
	return grpTemplate({displayType:item.item_display_status,
						pageIdx:page.idx,
						id:item.item_id,
						style:_style,
						children:content});
}


function renderItem(page,item,content){
	var cmds = [];
	var posStyle = posStyleTemplate(item);//位置由最外围决定
	var genStyle = [];
	var animationData = null;
	var transformStyle = renderTransform(item);
	
	
	item.pageIdx = page.idx;
	
	if(item.item_display_status == undefined)item.item_display_status = 0;
	
	if(item.item_opacity != 100){
		genStyle.push('opacity:' + (item.item_opacity/100));
	}
	
	if(item.item_href != null && item.item_href != ""){
		//hide_el:-2|hide_el:65185725
		cmds = convertOldCmd(item.item_href);
	}
		
	var funcKey = item.item_type.toString();
	var renderFunc = itemFuncMap[funcKey]
	
	animationData = animationParse(item);
	
	if(renderFunc == undefined ){
		console.log("no render function defined for",item);
		return NoTypeDefinedT({item_type:item.item_type,style:posStyle});
	}
	
	if(animationData == null && cmds.length == 0){
		genStyle.push(posStyle);
		if(transformStyle != "") genStyle.push(transformStyle);
		return renderFunc(page,item,genStyle,content)
	}
	
	var _itemContent = renderFunc(page,item,genStyle,content);//内容自己决定大小,位置有容器决定
		
	var conStyle = [posStyle];
	if(transformStyle != "")conStyle.push(transformStyle);
	
	if(cmds.length == 0 && animationData != null){
		return animationTemplate({animationClass:animationData.animationClass,
								  children:_itemContent,
								  animation:animationData.animation,
								  normalStyle:conStyle.join(','),
								  pageIdx:page.idx,
								  displayType:item.item_display_status,
								  id:item.item_id});
	}
	if(animationData != null){
		_itemContent = animationTemplate({animationClass:animationData.animationClass,
								  children:_itemContent,
								  animation:animationData.animation,
								  normalStyle:"",
								  pageIdx:page.idx,
								  displayType:0,
								  id:item.item_id});
	}
	if(cmds.length > 0){
		return touchTriggerTemplate({
			normalStyle:conStyle.join(','),
			children:_itemContent,
			pageIdx:page.idx,
			id:item.item_id,
			triggerActions:{evt:"tap",
							cmds:"[" + cmds.join(",") + "]"
						}
		});
	}
	return "";
	
	function animationParse(item){
		var animation = [];
		var animationClass = [];
		if(!(item.item_animation == null || item.item_animation === "" || item.item_animation === "none")){
			var temp = JSON.parse(item.item_animation_val);
			
			if(temp != null){
				if(temp instanceof Array){
					animation= [];
					var tempClass = JSON.parse(item.item_animation);
					_.each(temp,function(a,idx){
						animation.push({
							animationDelay:a.delay + "s",
							animationDuration:a.duration + "s",
							animationIterationCount:a.infinite,
						});
						if(idx < tempClass.length){
							animationClass.push(tempClass[idx]);
						}
					});
				}else{
					animation = [{
						animationDelay:temp.delay + "s",
						animationDuration:temp.duration + "s",
						animationIterationCount:temp.infinite,
					}];
					animationClass = [item.item_animation];
				}
			}else{
				animation = [defaultAnimation];
				animationClass = ["fadeIn"];
			}
			return {
				animation:JSON.stringify(animation),
				animationClass:JSON.stringify(animationClass),
			};
		}
		return null;
	}
	
	function convertOldCmd(item_href){
		var _cmdMap ={
			"hide_el":["componentDo","hide"],
			"show_el":["componentDo","show"],
		}
		var actionTemplate = _.template('{action:"<%= cmd %>",propagate:<%= propagate%>}');
			//hide_el:-2|hide_el:65185725
		var _cmds = item_href.split("|");
		var res = [];
		_.each(_cmds,function(cmd){
			var args = cmd.split(":");
			var new_cmd = _cmdMap[args[0]];
			var resStr = "";
			if(new_cmd != undefined){
				args.splice(0,1);
				new_cmd = new_cmd.concat(args);
				var _method = new_cmd[0];
				new_cmd.splice(0,1);
				resStr = _method + "(" + new_cmd.join(",") + ")";
				res.push(actionTemplate({cmd:resStr,propagate:true}));
			}
		});
		return res;
	}
}
	
	
}

module.exports = main;



