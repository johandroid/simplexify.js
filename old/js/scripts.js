/*jslint browser:true */
(function () {
    'use strict';

    /*jslint nomen: true*/
    var R = Function.prototype,
        $ = window.$,
		foodList = [],
		$grid = $('#food-grid'),
		$search = $('#search-div'),
		leap = 240,
		scrollSpeed = 1000,
		name = "";
    /*jslint nomen: false*/
	
	$.get('data.txt',
		function(data){
			foodList = data.split('#');
			for(var i = 0;i < foodList.length;i+=1){
				foodList[i] = foodList[i].split('|');
			}
		}
	);

	window.onscroll = function(){
		$('#menu').css({left : window.scrollX});
	};
	
	window.onresize = function(){
		// $grid.css('max-height', window.innerHeight - 220)
		$grid.css('max-height', window.innerHeight - 120)
	};
	
	var loadScript = function(path, callback) {
		var head = document.getElementsByTagName('head')[0],
			s = document.createElement('script');
		s.src = path;
		s.onload = callback;
		head.appendChild(s);
	};
	
    var empty = function (a) {
        return undefined === a || a === null || a === "" || a === "0" || a === 0 || (("object" === typeof a || "array" === typeof a) && a.length === 0);
    };
	
	var camelCase = function(a){
		var b = a.split(' '),
			c = b[0].toLowerCase(),
			i;
		for(i = 1; i < b.length; i += 1){
			c += b[i][0].toUpperCase() + b[i].substring(1);
		}
		return c;
	};
	
	var bindPickEvent = function(){
		$('#food-grid div').click(function(e){
			var $this = $(this),
				$clone = $('#clone');
			// $('body').append($clone.clone());
			// $clone.css('position','absolute');
			// $clone.css('left',this.offsetLeft - 60);
			// $clone.css('top',this.offsetHeight + 120);
			// $clone.attr('id','none');
			// $clone.css('background-image',$this.css('background-image'));
			// $this.append($clone);
			// $this.css('background-image', 'none');
			// $this.css('background', 'none');
			// $clone.animate({top : window.innerHeight - 100}, 100, function(){
				// $this.css('visibility','hidden');
			// })
		});
		$('#food-grid > div').hover(function(){		
			$('#food-grid div.active').removeClass('active');
		});
	};
	
	var mapFood = function(){
		var img,
			pop = Function.prototype;
			
		window.onresize();
		
		if($grid.html() != '') return;
		
		pop = function(i){
			if(i == foodList.length){
				$grid.append('<span class="clearfix"></span>');
				bindPickEvent();
				return;
			}
			setTimeout(function(){
				img = 'img/' + camelCase(foodList[i][0]) + '.png';
				$grid.append('<div id="food_'+i+'" class="foodie"><div style="background-image: url('+img+');" data-id="'+i+'"></div>'+foodList[i][0]+'</div>');
				pop(i+1);
			}, 1);
		};
		
		pop(1);
	};
	
	$('#menu a').click(function(e){
		e.preventDefault();
		var $this	= $(this),
			href	= $this.attr('href'),
			to 		= ($(href)[0].offsetLeft - 60) * -1;
			
		$('a.active').removeClass('active');
		$this.addClass('active');
				
		$grid.stop().fadeOut();
		
		$('#container').animate({ left : to}, 1500, function(){
			location.href = href;
			if(href == '#dps'){
				$grid.stop().fadeIn();
				mapFood();
			}
			this.style.left = to;
		});  
	});
	
	var toggleSearch = function(name){
		$search.html('searching for "' + name.toLowerCase() + '"... Press escape to search again');
		for(var a in foodList){
			var b = foodList[a][0].toLowerCase();
			if(b.indexOf(name.toLowerCase()) != -1){
				var $food = $('#food_' + a);
				$('#food-grid div.active').removeClass('active');
				$food.addClass('active');
				$grid.scrollTop($food[0].offsetTop - 90);
				break;
			}
		}
	};
	
	$('#add_constraint').click(function(){
		$('#constraints').append('<input type="text" class="constraint"/><br/>');
	});
	
	var compute = function(type){
		var input = {
			type: type,
			objective : $('#objective').val(),
			constraints : $(".constraint").filter(function(){
				return /\w/.test( $(this).val() );
			}).map(function(){ 
				return $(this).val(); 
			}).toArray()
		};
		console.log(input);
		var output = Simplexify.solve( input );
		$('#simplexify-result').html(output);	
	};
	
	$('#maximize').click(function(){
		compute('maximize');
	});
	
	$('#minimize').click(function(){
		compute('minimize');
	});
	
	
	$(document).keydown(function(e) {
		if(e.keyCode == 37){
			if(location.hash == '#dps'){
				$('a[accesskey="1"]').click();
			}
			if(location.hash == '#simplexify'){
				$('a[accesskey="2"]').click();
			}
		}
		else if(e.keyCode == 39){
			if(location.hash == '#home' || location.hash == ""){
				$('a[accesskey="2"]').click();
			}
			if(location.hash == '#dps'){
				$('a[accesskey="3"]').click();
			}
		}
		else if(e.keyCode == 38){
			$grid.stop(true, true).animate({scrollTop : '-='+leap}, scrollSpeed);
		}
		else if(e.keyCode == 40){
			$grid.stop(true, true).animate({scrollTop : '+='+leap}, scrollSpeed);
		}
		else if(e.keyCode == 27){
			name = "";
			$search.html('Type anywhere to search...');
		}
		else if(location.hash == '#dps' && (e.keyCode == 32 || (e.keyCode >= 65 && e.keyCode <= 90))){
			name += String.fromCharCode(e.keyCode);
			toggleSearch(name);
		}

	});
	
}());
