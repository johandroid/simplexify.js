/*jslint browser:true */
(function (root) {
    'use strict';

    /*jslint nomen: true*/
    var R = Function.prototype,
        $ = root.$,
		foodList = [],
		$container = $('#container'),
		$grid = $('#food-grid'),
		$search = $('#search-div'),
		$splxfy = $('#splxfy'),
		name = "";
    /*jslint nomen: false*/
	
	var camelCase = function(a){
		var b = a.split(' '),
			c = b[0].toLowerCase(),
			i;
		for(i = 1; i < b.length; i += 1){
			c += b[i][0].toUpperCase() + b[i].substring(1);
		}
		return c;
	};
	
	var mapFood = function(){
		var img,
			pop = Function.prototype;
		
		pop = function(i){
			if(i == foodList.length){
				$grid.append('<span class="clearfix"></span>');
				$('.foodie').click(function(){
					console.log('clicked');
					if($(this).hasClass('active')){
						$(this).removeClass('active');
					}
					else{
						$(this).addClass('active');
					}
				});
				return;
			}
			setTimeout(function(){
				img = 'img/' + camelCase(foodList[i][0]) + '.png';
				$grid.append(' \
					<div id="food_'+i+'" class="foodie span3">	\
						<div class="foodie-image" style="background-image: url('+img+');" data-id="'+i+'"></div>\
						<div class="foodie-details">'+foodList[i][0]+'<br/>'+foodList[i][1]+'</div> \
					</div> \
				');
				pop(i+1);
			}, 10);
		};
		
		pop(1);
	};
	
	$('#menu li a').click(function(e){
		$('a.active').removeClass('active');
		$this.addClass('active');
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
	
	$('#add_button').click(function(){
		$('#constraints').append('<div class="input-append">	\
							<input type="text" class="constraint"/>	\
							<span class="add-on" onclick="$(this).parent().fadeOut();"><i class="icon-minus"></i></span>	\
						</div>');
	});
	
	$('#solve_button').click(function(){
		$('#plain-results').html('');
		var input = {
				type: 'maximize',
				objective : $('#objective_function').val(),
				constraints : $(".constraint").filter(function(){
					return /\w/.test( $(this).val() );
				}).map(function(){ 
					return $(this).val(); 
				}).toArray()
			};
		$('#plain-results').append(Simplexify.solve( input ));
	});
	
	
	$(document).keydown(function(e) {
		if(e.keyCode == 27){
			name = "";
			$search.html('Type anywhere to search...');
		}
		else if(location.hash != '#simplexify' && (e.keyCode == 32 || (e.keyCode >= 65 && e.keyCode <= 90))){
			name += String.fromCharCode(e.keyCode);
			toggleSearch(name);
		}

	});
	
	var AppRouter = Backbone.Router.extend({
		routes: {
			'home'					: 'homePage',
			'simplexify'			: 'simplexifyPage',
			'*actions'				: 'homePage'
		},
		initialize : function(){
			$splxfy.hide();
			$grid.show();
		},
		homePage : function(){
			$splxfy.hide();
			$grid.show();
		},
		simplexifyPage : function(){
			$splxfy.show();
			$grid.hide();
		}
	});
	
	
	$.get('data.txt',
		function(data){
			foodList = data.split('#');
			for(var i = 0;i < foodList.length;i+=1){
				foodList[i] = foodList[i].split('|');
			}
			new AppRouter();
			Backbone.history.start();
			mapFood();
		}
	);
}(this));
