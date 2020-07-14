
		var transformRequest = (url, resourceType) => {
			var isMapboxRequest =
				url.slice(8, 22) === "api.mapbox.com" ||
				url.slice(10, 26) === "tiles.mapbox.com";
			return {
				url: isMapboxRequest
					? url.replace("?", "?pluginName=sheetMapper&")
					: url
			};
		};

		//YOUR TURN: add your Mapbox token
		mapboxgl.accessToken = 'pk.eyJ1IjoiYWNraW5kbGUzIiwiYSI6ImNrYzYzcWFnOTA5bjQycnRlY2t4OWxlMWUifQ.a3wwi4cHq1sHakuoT9Bo0w';

		var map;
		var studentInfo = [];
		var popup = new mapboxgl.Popup({ closeOnMove: true, closeOnClick: true })

		$(document).ready(function () {

			$("#verification").modal('show');

			$('#form-verification').submit(function (e) {
				e.preventDefault();
				const param = { code: $('#form-verification > input').val().trim() };

				if (param['code'] != "") {
					$.ajax({
						type: 'GET',
						url: 'verification',
						dataType: 'text',
						data: param,
						success: function (csvData) {
							initialize(csvData);
							$('#verification').modal('hide');
							$('#overlay').show();
						},
						error: function (res) {
							$('#form-verification > input').val('');
							$('#msg-wrong').remove();
							$('#verification').find('.modal-body').prepend('<p id="msg-wrong">访问密码错误</p>');
							$('#msg-wrong').animate({ 'opacity': 1 }, 500)
						}
					});
				}
			});

			function initialize(csvData) {
				//Mapbox token
				map = new mapboxgl.Map({
					container: 'map', // container id
					style: 'mapbox://styles/mapbox/streets-v11', //stylesheet location
					center: [114.121677, 22.551557], // starting position
					zoom: 4,// starting zoom
					transformRequest: transformRequest
				});
				map.dragRotate.disable();
				map.touchZoomRotate.disableRotation();
				makeGeoJSON(csvData);
			}

			function makeGeoJSON(csvData) {
				csv2geojson.csv2geojson(csvData, {
					latfield: 'Latitude',
					lonfield: 'Longitude',
					delimiter: ','
				}, function (err, data) {
					map.on('load', function () {
						//Add the the layer to the map
						map.addLayer({
							'id': 'csvData',
							'type': 'circle',
							'source': {
								'type': 'geojson',
								'data': data
							},
							'paint': {
								'circle-radius': 5,
								'circle-color': "purple"
							}
						});

						// When a click event occurs on a feature in the csvData layer, open a popup at the
						// location of the feature, with description HTML from its properties.
						data.features.forEach(feature => {
							//studentInfo[(feature['properties']['Name'])] = feature;
							studentInfo.push(feature);
						});

						map.on('mouseover', 'csvData', function (e) { createPopup(e.features); });

						map.on('touchstart', 'csvData', function (e) { createModal(e.features); });

						// Change the cursor to a pointer when the mouse is over the places layer.
						map.on('mouseenter', 'csvData', function () {
							map.getCanvas().style.cursor = 'pointer';
						});

						// Change it back to a pointer when it leaves.
						map.on('mouseleave', 'places', function () {
							map.getCanvas().style.cursor = '';
							popup.remove();
						});

                        $('#overlay').fadeOut();
                        $('#btn-group-switch-lang').show();

					});

				});
			};
		});

		// Create a popup on the destinated point
		function createPopup(features) {
			var coordinates = features[0].geometry.coordinates.slice();
			var i = 0;
			function appendPageCount(){
				$("#popup").find('.card-title').append('<span class="page-count"> (' + (i + 1) + '/' + features.length + ')</span>');
			}

			temp = '<div id="popup" class="card">'
				+ '<div class="card-body">'
				+ '<div class="card-title-container">'
					+ '<h5 class="card-title"></h5>'
				+ '</div>'
				+ '<ul style="list-style:none; padding-left:0">'
				+ '<li>' + '<i class="fa fa-university"></i><span></span></li>'
				+ '<li>' + '<i class="fa fa-book"></i><span></span></li>'
				+ '<li>' + '<i class="fa fa-phone"></i><span></span></li>'
				+ '<li>' + '<i class="fa fa-wechat"></i><span></span></li>'
				+ '<li>' + '<i class="fa fa-home"></i><span></span></li>'
				+ '</ul>'
				+ '</div>'
				+ '</div>';

			var description = formatDescription($(temp), features[i])[0].outerHTML;

			// Add Popup to map
			popup.setLngLat(coordinates)
				.setHTML(description)
				.addTo(map);

			// When there're multiple people at the same point
			if (features.length > 1) {
				appendPageCount();
				
				// Add btn group to the popup
				$('#popup').append(
				'<div class="btn-group">'
					+'<button id="btn-prev" class="btn btn-primary">' 
						+ FeatureText.prev()
						+ '<i class="fa fa-angle-right"></i>' 
					+ '</button>'
					+ '<button id="btn-next" class="btn btn-primary">' 
						+ FeatureText.next()
						+ '<i class="fa fa-angle-right"></i>'
					+ '</button>'
				+ '</div>');
				
				$('#btn-next').click(e => {
					if (i == features.length - 1) i = -1;
					formatDescription($('#popup'), features[++i]);
					appendPageCount();
				});
				
				$('#btn-prev').click(e => {
					if (i == 0) i = features.length;
					formatDescription($('#popup'), features[--i]);
					appendPageCount();
				});
			}
			else {
				$("#popup").find('.page-count').hide();
			}
		}

		function createModal(features) {
			var i = 0;
			
			function appendPageCount() {
				$("#card-info").find('.card-title').append('<span class="page-count"> (' + (i + 1) + '/' + features.length + ')</span>');
			}

			formatDescription($('#card-info'), features[i]);

			if (features.length > 1) {
				appendPageCount()
				$('#modal-btn-group').show();
				$("#card-info").find('.page-count').show();
				
				$('#modal-btn-next').click(e => {
					if (i == features.length - 1) i = -1;
					formatDescription($('#card-info'), features[++i]);
					appendPageCount()
				});
				
				$('#modal-btn-prev').click(e => {
					if (i == 0) i = features.length;
					formatDescription($('#card-info'), features[--i]);
					appendPageCount()
				});
			}
			else {
				$('#modal-btn-next').hide();
				$("#card-info").find('.page-count').hide();
			}

			$('#card-info').modal('show');
		}

		//set popup text
		//You can adjust the values of the popup to match the headers of your CSV.
		// For example: e.features[0].properties.Name is retrieving information from the field Name in the original CSV.
		function formatDescription(element, feature) {
			element.find('h5').text(FeatureText.name(feature));
			element.find('span').get(0).innerHTML = FeatureText.school(feature);
			element.find('span').get(1).innerHTML = FeatureText.major(feature);
			element.find('span').get(2).innerHTML = FeatureText.phone(feature);
			element.find('span').get(3).innerHTML = FeatureText.wechat(feature);
			element.find('span').get(4).innerHTML = FeatureText.class_(feature);
			element.find('li').each((i, e) => {
				if ($(e).find('span').text().trim() == '') {
					$(e).hide();
				} else {
					$(e).show();
				}
			});
			return element;
		}

		$("#form-search > input").on('keyup', function (e) {
			updateSearchDropDown();
		});

		// By submitting a search action without selecting displayed choices, the user will be guided to the most possible choice
		$('#form-search').submit(function (e) {
			e.preventDefault();
			const keyword = $('#form-search > input')[0].value;
			var info = searchByKeyword(keyword, 1)[0]?.value;
			if (info != undefined) {
				$('#form-search > input')[0].value = '';
				jumpTo(info);
			}
		});

		// Update the dropdown list according to the keyword
		function updateSearchDropDown() {
			const keyword = $('#form-search > input')[0].value;

			if (keyword != '' && keyword.length >= 1) {
				// Generate the search results and hide the dropdown list in case there's no matches
				results = searchByKeyword(keyword)
				if (results.length == 0) {
					$('#search-dropdown').fadeOut();
					return;
				};

				// Show the dropdown list and remove all previous items on it
                $('#search-dropdown').show();
                $('#search-dropdown').css({ 'height': 'unset' });
				$('#search-dropdown a').remove();

				// Append list items to the dropdown list
				results.slice(0, 4).forEach(result => {
					$('#search-dropdown').append('<a class="dropdown-item" onclick="jumpToByName(\'' + result.value.properties.NameCN + '\');$(\'#search-dropdown\').fadeOut();">' + FeatureText.name(result.value) + '<p>' + keyNameToFA(result.matchedPattern.matchedKey) + result.matchedPattern.matchedSubstr + '</p></a>');
                });
                if (results.length > 4) {
                    $('#search-dropdown').append('<a id="item-show-more" class="dropdown-item">show more</a>');
                    $('#search-dropdown').css({ 'height': $('#search-dropdown').css('height') });
					$('#item-show-more').click(function (e) {
						$(this).hide();
						results.slice(4).forEach(result => {
                            $('#search-dropdown').append('<a class="dropdown-item" onclick="jumpToByName(\'' + result.value.properties.NameCN + '\');$(\'#search-dropdown\').fadeOut();">' + FeatureText.name(result.value) + '<p>' + keyNameToFA(result.matchedPattern.matchedKey) + result.matchedPattern.matchedSubstr + '</p></a>');
                        });
					});
				}
			}
			else {
				// Hide the dropdown list when the input keyword is empty
				$('#search-dropdown').fadeOut();
			}
		}

		// Jump to the point to which info refers
		function jumpTo(info) {
			popup.remove();
			if (info != undefined) {
				map.jumpTo({
					center: info.geometry.coordinates,
					zoom: 10
				});
				if (document.body.clientWidth < 767) {
                    createModal([info]);
				} else {
                    createPopup([info]);
				}
			}
		}

		// Jump to the point according to the name
		function jumpToByName(name) {
			studentInfo.forEach(info => {
				if (info.properties.NameCN == name) {
					jumpTo(info);
					return;
				}
			});
		}

		function searchByKeyword(origKeyword, limit = -1) {
			var weightedResultList = [];
			var keyword = origKeyword.trim().toLowerCase();
			if (keyword == '') {
				return weightedResultList;
			}
			for (var i = 0; i < studentInfo.length; i++) {
				var priority = 0;
				var matchedPattern;
				// Iterate through each key-value pair studentInfo contains
				for (key in studentInfo[i].properties) {
					infoText = studentInfo[i].properties[key]?.toLowerCase();
					var matchResult = (infoText != undefined) ? PinyinMatch.match(infoText, keyword) : false;
					if (infoText != undefined && (infoText.indexOf(keyword) != -1 || matchResult)) {
						var aliases = studentInfo[i].properties[key].split(';');
						var matchedSubstr = studentInfo[i].properties[key];
						for (var n = 0; n < aliases.length; n++) {
							if (aliases.length == 1) break;
							if (aliases[n].toLowerCase().indexOf(keyword) != -1 || PinyinMatch.match(aliases[n], keyword)) {
								matchedSubstr = aliases[n];
							}
						}
						matchedPattern = { matchedKey: key, matchedSubstr: matchedSubstr };
						if (infoText == keyword || (matchResult != false && matchResult[1] - matchResult[0] + 1 == infoText.length)) {
							priority += 999;
							break;
						}
						priority += keyword.length;
						if (infoText.indexOf(keyword) == 0) {
							priority += 1;
						}
						if (key == 'NameCN' || key == 'NameEN') {
							priority += 4;
						}
					}
				}
				if (priority > 0) {
					weightedResultList.push({ priority: priority, value: studentInfo[i], matchedPattern: matchedPattern });
					if (limit != -1 && weightedResultList.length == limit) {
						break;
					}
				}
			};
			weightedResultList.sort((a, b) => (Math.sign(b.priority - a.priority)));
			return weightedResultList;
		}

		function keyNameToFA(keyName) {
			switch (keyName) {
				case 'SchoolCN':
				case 'SchoolLong':
				case 'SchoolShort':
					return '<i class="fa fa-university"></i>';
				case 'MajorCN':
				case 'MajorEN':
					return '<i class="fa fa-book"></i>';
				case 'Phone':
					return '<i class="fa fa-phone"></i>';
				case 'WeChat':
					return '<i class="fa fa-wechat"></i>';
				case 'Class':
					return '<i class="fa fa-home"></i>';
			}
			return '';
		}

		// 0 for Chinese, 1 for English
		var lang = 0

        $('#btn-group-switch-lang').find('.btn').click(function (e) {
			// Toggles the language
			$('#modal-btn-next').text(FeatureText.next());
			$('#modal-btn-prev').text(FeatureText.prev());
            if ($('#option-cn')[0].checked) {
                lang = 0;
				$('#form-search > .form-control')[0].placeholder = '搜索';
				$('#form-search > .input-group-append > .btn').text('搜索');
			}
            else if ($('#option-en')[0].checked) {
                lang = 1;
                $('#form-search > .form-control')[0].placeholder = 'Search';
                $('#form-search > .input-group-append > .btn').text('Search');
            }
		});

		// class with static functions to display text according to current language setting
		class FeatureText {

			static name(feature) {
				switch (lang) {
					case 0:
						return feature.properties.NameCN;
					case 1:
						return feature.properties.NameEN;
				}
			}

			static class_(feature) {
				switch (lang) {
					case 0:
						return '高三 (' + feature.properties.Class + ') 班';
					case 1:
						return 'Class ' + feature.properties.Class + ' Grade 12';
				}
			}

			static phone(feature) {
				return feature.properties.Phone;
			}

			static wechat(feature) {
				return feature.properties.WeChat;
			}

			static school(feature) {
				switch (lang) {
					case 0:
						return feature.properties.SchoolCN;
					case 1:
						return feature.properties.SchoolLong;
				}
			}

			static major(feature) {
				switch (lang) {
					case 0:
						return feature.properties.MajorCN;
					case 1:
						return feature.properties.MajorEN;
				}
			}

			static next() {
				switch (lang) {
					case 0:
						return "下一个";
					case 1:
						return "Next";
				}
			}
			
			static prev() {
				switch (lang) {
					case 0:
						return "上一个";
					case 1:
						return "Previous";
				}
			}

			static location(feature) {
				return feature.properties.CountryRegion + feature.properties.Region + feature.properties.City;
			}
		}