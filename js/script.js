
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
		var dataReceived = false;
		const Curriculum = {};
		Curriculum.GAOKAO = 0;
		Curriculum.INTERNATIONAL = 1;
		var curriculum;
		const URL_LOGIN = '/login', URL_SIGNUP = '/signup', URL_CHECK_PHONE_NUM = '/checkPhoneNum', URL_GET_CODE = '/getVerificationCode';

		$(document).ready(function () {

			$(':root').css({'--vh': window.innerHeight / 100 + 'px'});

			$("#verification").modal('show');

			$('#form-verification, #form-verification-student').submit(function(e){
				e.preventDefault();
				$('#btn-verification').click();
			})

			if($.cookie('phoneNum') != undefined && $.cookie('passwordSha') != undefined){
				const params = { phoneNum: $.cookie('phoneNum'), passwordSha: $.cookie('passwordSha')};
				ajaxVerify(URL_LOGIN, params);
			}

			$('#btn-toggle-verification').click(function (e){
				if($('#form-signup').hasClass('show')){
					$('#btn-toggle-verification').text('去注册');
				}
				else{
					$('#btn-toggle-verification').text('去登录');
				}
			});

			$('#btn-send-sms').click(function (e){
				e.preventDefault();
				phoneNumLookup($('#input-phone-number-signup').val().trim(), function(status){
					if(status == '1'){
						showError('该电话号码未被白名单收录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
						return;
					}
					if(status == '2'){
						showError('该电话号码已注册！请直接登录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
						return;
					}
					if(status == 0){
						var countDown = 60;
						$('#btn-send-sms')[0].disabled = true;
						$('#btn-send-sms').text(`发送验证码(${countDown--})`);
						param = {
							phoneNum: $('#input-phone-number-signup').val()
						}
						$.ajax({
							type: 'GET',
							url: URL_GET_CODE,
							data: param,
							success: function(result) {
							}
						});
						var smsInterval = setInterval(function(e){
							if(countDown > 0){
								$('#btn-send-sms').text(`发送验证码(${countDown})`);
								countDown--;
							}
							else {
								$('#btn-send-sms')[0].disabled = false;
								$('#btn-send-sms').text('发送验证码');
								clearInterval(smsInterval);
							}
						}, 1000);
					}
				});
			});

			function validateForm(){
				if($('#form-signup').hasClass('show')){
					if($('#input-phone-number-signup').val().trim() == ''){
						showError('请输入电话号码');
					}
					else if(!validatePhoneNum($('#input-phone-number-signup').val().trim())){
						showError('请正确输入电话号码');
					}
					else if($('#input-password-signup').val() == ''){
						showError('请输入密码');
					}
					else if($('#input-password-confirm').val() == ''){
						showError('请再次输入密码');
					}
					else if($('#input-password-signup').val() != $('#input-password-confirm').val()){
						showError('两次输入密码不一致');
					}
					else if($('#input-verification-code').val() == ''){
						showError('请输入验证码');
					}
					else {
						showError('');
						return true;
					}
				}
				else {
					if($('#input-phone-number-login').val().trim() == ''){
						showError('请输入电话号码');
					}
					else if(!validatePhoneNum($('#input-phone-number-login').val().trim())){
						showError('请正确输入电话号码');
					}
					else if($('#input-password-login').val() == ''){
						showError('请输入密码');
					}
					else {
						showError('');
						return true
					}
				}
				return false;
			}

			function validatePhoneNum(phoneNum){
				result = phoneNum.match(/[1-9][0-9]+/);
				return result != undefined && result[0].length == phoneNum.length;
			}

			// Lookup the phone number in the database and gives true to the callback if the phone number is valid.
			function phoneNumLookup(phoneNum, callback){
				if(!validatePhoneNum(phoneNum)){
					showError('请正确输入电话号码');
				}
				else{
					param = {
						phoneNum: phoneNum
						}
					$.ajax({
						type: 'GET',
						data: param,
						url: URL_CHECK_PHONE_NUM,
						dataType: 'text',
						success: function(msg){
							if(msg == '0'){
								showError('');
								callback(0);
							}
							if(msg == '1'){
								callback(1);
							}
							if(msg == '2'){
								callback(2);
							}
						}
					});
				}
			}

			$('#btn-verification').click(function (e) {
				e.preventDefault();
				var param, url;
				if(validateForm() == false){
					return;
				}
				if($('#form-signup').hasClass('show')){
					url = URL_SIGNUP;
					param = {
						phoneNum: $('#input-phone-number-signup').val().trim(),
						passwordSha: sha256($('#input-password-signup').val()),
						verificationCode: $('#input-verification-code').val().trim()
					};
				}
				else{
					url = URL_LOGIN;
					param = {
						phoneNum: $('#input-phone-number-login').val().trim(),
						passwordSha: sha256($('#input-password-login').val())
					};
				}
				ajaxVerify(url, param);
			});

			$('#input-phone-number-signup').blur(function (e){
				phoneNumLookup($('#input-phone-number-signup').val().trim(), function(status){
					if(status == '1'){
						showError('该电话号码未被白名单收录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
					}
					if(status == '2' && $('#form-signup').hasClass('show')){
						showError('该电话号码已注册！请直接登录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
					}
				});
			});

			function ajaxVerify(url, param){
				phoneNumLookup(param.phoneNum, function(status){
					if(status == '1'){
						showError('该电话号码未被白名单收录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
					}
					if(url == URL_SIGNUP && status == '2'){
						showError('该电话号码已注册！请直接登录。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
					}
					// When the callback status is 2 (user already exists), the url needs to be URL_LOGIN to make sure that the ajax request will be sent
					if(status != '1' && (url == URL_LOGIN || status != '2')){
						$.ajax({
							type: 'GET',
							url: url,
							dataType: 'text',
							data: param,
							success: function (result) {
								if(result.substr(0, 1) == '1'){
									showError('请正确输入电话号码');
								}
								else if(result.substr(0, 1) == '2'){
									showError('验证码错误');
								}
								else if(result.substr(0, 1) == '3'){
									showError('电话号码或密码错误');
								}
								else {
									if(!dataReceived){
										dataReceived = true;
										if($.cookie('phoneNum') == undefined && $.cookie('passwordSha') == undefined){
											$('#modal-helper').modal('toggle');
										}
										if($('#check-remember-password')[0].checked){
											$.cookie('phoneNum', param['phoneNum']);
											$.cookie('passwordSha', param['passwordSha']);
										}
										$('*[href^="maps"]').each(function(tag){
											$(this).attr('href', `${$(this).attr('href')}`
											+ `?phoneNum=${param['phoneNum']}`
											+ `&passwordSha=${param['passwordSha']}`);
										});
										$('*[data-src^="maps"]').each(function(tag){
											$(this).attr('src', `${$(this).attr('data-src')}`
											+ `?phoneNum=${param['phoneNum']}`
											+ `&passwordSha=${param['passwordSha']}`);
										});
										initialize(result);
										$('#verification').modal('hide');
										$('#overlay').show();
									}
								}
							},
							error: function (res) {
								showError('访问错误。<br />如需帮助，请联系<i class="fa fa-wechat" style="color:#28a745"></i>jychen630');
							}
						});
					}
				});
			}

			function showError(msgHTML){
				$('#msg-wrong').remove();
				if(msgHTML != ''){
					$('#verification').find('.modal-body').prepend(`<p id="msg-wrong">${msgHTML}</p>`);
					$('#msg-wrong').animate({ 'opacity': 1 }, 500);
				}
			}

			function initialize(csvData) {
				//Mapbox token
				map = new mapboxgl.Map({
					container: 'map', // container id
					style: 'mapbox://styles/mapbox/streets-v8', //stylesheet location
					center: [114.121677, 22.551557], // starting position
					zoom: -2,// starting zoom
					transformRequest: transformRequest
				});
				map.dragRotate.disable();
				map.touchZoomRotate.disableRotation();
				updateNameScroll();
				makeGeoJSON(csvData);
			}

			function makeGeoJSON(csvData) {
				csv2geojson.csv2geojson(csvData, {
					latfield: 'Latitude',
					lonfield: 'Longitude',
					delimiter: ','
				}, function (err, data) {
					map.on('load', function () {
						var info = data.features.shift().properties.NameCN;
						$('#helper-msg')[0].innerHTML = FeatureText.helperMsg();
						langRefresh();
						if(info == 'gaokao'){
							map.setZoom(2);
							map.setCenter([108.003565, 25.594860]);
							//map.setMaxBounds([[43.916113, 1.414517],[177.275332, 57.598319]]);
							curriculum = Curriculum.GAOKAO;
							$('#btn-show-map').remove();
							$('#btn-group-switch-lang').css({'visibility':'hidden'});
						}
						else {
							curriculum = Curriculum.INTERNATIONAL;
						}
						//Add the the layer to the map
						map.addLayer({
							'id': 'csvData',
							'type': 'circle',
							'source': {
								'type': 'geojson',
								'data': data
							},
							'paint': {
								'circle-radius': 7,
								'circle-color': "rgba(106,0,210,0.48)"
							}
						});

						// When a click event occurs on a feature in the csvData layer, open a popup at the
						// location of the feature, with description HTML from its properties.
						data.features.forEach(feature => {
							//studentInfo[(feature['properties']['Name'])] = feature;
							studentInfo.push(feature);
						});

						function normalize(v) {
							// Quadratic function that maps map zoom level ranges in [-2, 22] to the radius of the circle ranges in [7, 12]
							return -0.0086 * Math.pow(v - 22, 2) + 11.5
						}

						map.on('zoom',function(e){e.target.setPaintProperty('csvData','circle-radius',normalize(e.target.getZoom()));});

						map.on('mouseenter', 'csvData', function (e) { createPopup(e.features, e); });

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
                        $('.bubble').show();
                        $('#btn-group-switch-lang').show();

					});

				});
			};
		});

		// Create a popup on the destinated point
		function createPopup(features, e=undefined) {
			var coordinates = features[0].geometry.coordinates.slice();
			var i = 0;
			function appendPageCount(){
				$("#popup").find('.card-title').append('<span class="page-count"> (' + (i + 1) + '/' + features.length + ')</span>');
			}

			var $temp = $('<div id="popup" class="card">'
				+ '<div class="card-body">'
				+ '<div class="card-title-container">'
					+ '<h5 class="card-title"></h5>'
				+ '</div>'
				+ '<ul style="list-style:none; padding-left:0">'
				+	'<li><i class="fa fa-map-pin"></i><span></span></li>'
				+	'<li><i class="fa fa-map"></i><span></span></li>'
				+	'<li><i class="fa fa-building"></i><span></span></li>'
				+ '<li><i class="fa fa-university"></i><span></span></li>'
				+ '<li><i class="fa fa-book"></i><span></span></li>'
				+ '<li><i class="fa fa-phone"></i><span></span></li>'
				+ '<li><i class="fa fa-wechat"></i><span></span></li>'
				+ '<li><i class="fa fa-home"></i><span></span></li>'
				+ '</ul>'
				+ '</div>'
				+ '</div>');

			if (features.length > 1) {
				// Add btn group to the popup
				$temp.append(
					'<div class="btn-group">'
						+'<button id="btn-prev" class="btn btn-primary">'
							+ '<i class="fa fa-angle-left"></i>'
							+ FeatureText.prev()
						+ '</button>'
						+ '<button id="btn-next" class="btn btn-primary">'
							+ FeatureText.next()
							+ '<i class="fa fa-angle-right"></i>'
						+ '</button>'
					+ '</div>');
			}

			var description = formatDescription($temp, features[i])[0].outerHTML;

			if(e != undefined){
				while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
					coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
				}
			}

			// Add Popup to map
			popup.setLngLat(coordinates)
				.setHTML(description)
				.addTo(map);

			// When there're multiple people at the same point
			if (features.length > 1) {
				appendPageCount();

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
				$('#modal-btn-group').hide();
				$("#card-info").find('.page-count').hide();
			}

			$('#card-info').modal('show');
		}

		//set popup text
		//You can adjust the values of the popup to match the headers of your CSV.
		// For example: e.features[0].properties.Name is retrieving information from the field Name in the original CSV.
		function formatDescription(element, feature) {
			if(parseInt(feature.properties.IsGap) >= 1){
				switch(parseInt(feature.properties.IsGap)){
					case 1:
						element.find('h5').text(FeatureText.name(feature) + ' (Gapping)');
						break;
					case 2:
						element.find('h5').text(FeatureText.name(feature) + ' (Deferring)');
						break;
				}
			}
			else {
				element.find('h5').text(FeatureText.name(feature));
			}
			element.find('span').get(0).innerHTML = FeatureText.countryRegion(feature);
			element.find('span').get(1).innerHTML = FeatureText.region(feature);
			element.find('span').get(2).innerHTML = FeatureText.city(feature);
			element.find('span').get(3).innerHTML = FeatureText.school(feature);
			element.find('span').get(4).innerHTML = FeatureText.major(feature);
			element.find('span').get(5).innerHTML = FeatureText.phone(feature);
			element.find('span').get(6).innerHTML = FeatureText.wechat(feature);
			element.find('span').get(7).innerHTML = FeatureText.class_(feature);
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

		$("#form-search > input").on('focus', function (e) {
			updateSearchDropDown();
		});

		// By submitting a search action without selecting displayed choices, the user will be guided to the most possible choice
		$('#form-search').submit(function (e) {
			e.preventDefault();
			const keyword = $('#form-search > input')[0].value;
			if(searchByKeyword(keyword, 1)[0] != undefined){
				var info = searchByKeyword(keyword, 5)[0].value;
			}
			if (info != undefined) {
				$('#form-search > input')[0].value = '';
				jumpTo(info);
			}
		});

		// Update the dropdown list according to the keyword
		function updateSearchDropDown() {
			const keyword = $('#form-search > input')[0].value;

			if (keyword != undefined && keyword.length > 0) {
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
                    $('#search-dropdown').append('<a id="item-show-more" class="dropdown-item">' + ((lang == 0)?'更多':'show more') + '</a>');
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
					if(studentInfo[i].properties[key] != undefined){
						infoText = studentInfo[i].properties[key].toLowerCase();
					}
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
						if(key == 'Class'){
							matchedSubstr = `高三 (${matchedSubstr}) 班`;
						}
						if(key == 'IsGap'){
							switch(parseInt(matchedSubstr)){
								case 0:
									matchedSubstr = 'Regular';
									break;
								case 1:
									matchedSubstr = 'Gapping';
									break;
								case 2:
									matchedSubstr = 'Deferring';
									break;
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
				case 'School':
				case 'SchoolCN':
				case 'SchoolLong':
				case 'SchoolShort':
					return '<i class="fa fa-university"></i>';
				case 'Major':
				case 'MajorCN':
				case 'MajorEN':
					return '<i class="fa fa-book"></i>';
				case 'Phone':
					return '<i class="fa fa-phone"></i>';
				case 'WeChat':
					return '<i class="fa fa-wechat"></i>';
				case 'Class':
					return '<i class="fa fa-home"></i>';
				case 'CountryRegion':
					return '<i class="fa fa-map-pin"></i>';
				case 'Region':
				case 'RegionCN':
				case 'RegionEN':
					return '<i class="fa fa-map"></i>';
				case 'CountryRegion':
					return '<i class="fa fa-map-pin"></i>';
				case 'City':
				case 'CityCN':
				case 'CityEN':
					return '<i class="fa fa-building"></i>'
			}
			return '';
		}

		// 0 for Chinese, 1 for English
		var lang = 0
		var forceSwitch = false;
		var trigger = false;

        $(document).on('mouseup', '#btn-group-switch-lang .btn', function (e) {
			langRefresh();
		});

		function langRefresh(){
			// Toggles the language
			if($('#list-display').css('display') == 'none' || $('#list-display > .tags-container > .tag').length == 1 || forceSwitch){
				setTimeout(function(e){
					$('#modal-btn-next').text(FeatureText.next());
					$('#modal-btn-prev').text(FeatureText.prev());
					if ($('#option-cn')[0].checked) {
						lang = 0;
						$('#form-search > .form-control')[0].placeholder = '请输入关键词';
						$('#form-search > .input-group-append > .btn').text('搜索');
					}
					else if ($('#option-en')[0].checked) {
						lang = 1;
						$('#form-search > .form-control')[0].placeholder = 'Type in keywords';
						$('#form-search > .input-group-append > .btn').text('Search');
					}
					if(forceSwitch){
						$('#list-display > .tags-container > .tag').each((i, tag) => {
							if(tag != $('#btn-add-tag')[0]){
								$(tag).remove();
							}
						});
					}
					updateListDisplay();
					forceSwitch = false;
					$('#tag-dropdown-menu-link').text(FeatureText.chooseFilter());
					$('#btn-add-tag > span > span').text(FeatureText.filter());
					$('#list-hint').text(FeatureText.listHintMsg());
					$('#add-tag-hint').text(FeatureText.addTagHintMsg());
					$('#modal-add-tag-title').text(FeatureText.modalAddTagTitleMsg());
					$('#modal-confirm-hint').text(FeatureText.modalConfirmHintMsg());
					$('#map-download-link-hint').text(FeatureText.mapDownloadLinkHintMsg());
					$('.feature-text-confirm').text(FeatureText.confirm());
					$('.feature-text-cancel').text(FeatureText.cancel());
					$('#helper-msg')[0].innerHTML = FeatureText.helperMsg();
					$('#modal-helper-title').text(FeatureText.helperTitle());
					$('#modal-map-title').text(FeatureText.modalMapTitle());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="School"] > span').text(FeatureText.filterSchool());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="Major"] > span').text(FeatureText.filterMajor());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="Class"] > span').text(FeatureText.filterClass());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="CountryRegion"] > span').text(FeatureText.filterCountryRegion());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="Region"] > span').text(FeatureText.filterRegion());
					$('#tag-dropdown-menu > .dropdown-item[data-property-name="City"] > span').text(FeatureText.filterCity());
				}, 0);
			}
			else {
				$('#modal-confirm').modal('show');
			}
		}

		$('#modal-confirm').on('hide.bs.modal', function(e) {
			if(!forceSwitch) {
				if($('#btn-group-switch-lang .btn').first().hasClass('active')){
					$($('#btn-group-switch-lang .btn')[1]).click();
				}
				else {
					$('#btn-group-switch-lang .btn').first().click();
				}
			}
		});

		$('#map').click(function(e) {
			$('#search-dropdown').fadeOut();
		});

		$('#btn-modal-confirm').click(function(e) {
			forceSwitch = true;
			$('#modal-confirm').modal('hide');
			$('#btn-group-switch-lang > btn').each(btn => {
				if($(btn).hasClass('active')){
					$(btn).removeClass('active');
					$(btn).find('input').checked = false;
				}
				else {
					$(btn).addClass('active');
					$(btn).find('input').checked = true;
				}
			});
			langRefresh();
		});

		$('#btn-list-display').click(function(e){
			if($('#list-display').css('display') == 'none'){
				updateListDisplay();
				$('#search-dropdown').fadeOut();
				$('#form-search input')[0].disabled = true;
				$('#form-search button')[0].disabled = true;
				$('#list-display').fadeIn(250);
			}
			else{
				$('#form-search input')[0].disabled = false;
				$('#form-search button')[0].disabled = false;
				$('#list-display').fadeOut(250);
			}
		});

		$('#btn-add-tag').click(function(e){
			$('#tag-dropdown-menu-link').text(FeatureText.chooseFilter());
			$('#tag-selection > .tag').remove();
		});

		$('#tag-dropdown-menu > .dropdown-item').click(function(e){
			$('#tag-dropdown-menu-link').text($(e.target).text());
			var $element = $getTarget('dropdown-item', e.target);
			var properties = FeatureText.getPropertiesFromFeatures(studentInfo, $element.attr('data-property-name'));
			$('#tag-selection > .tag').remove();

			for(var i = 0; i < properties.length; i++){
				if($('#list-display > .tags-container > .tag[data-property="' + properties[i].property + '"]').length > 0){
					continue;
				}
				var tagElement = '<div class="tag" data-property="' + properties[i].property + '" data-property-name="' + $element.attr('data-property-name') + '"><span>'
										+ keyNameToFA($element.attr('data-property-name'))
										+ properties[i].property
										+ '<span class="badge badge-primary badge-pill">' + properties[i].count + '</span>'
									+ '</span></div>'
				$('#tag-selection').append(tagElement);
			}

			// Triggered when the user clicks on the tags
			$('#tag-selection > .tag').click(function(e){
				var $element = $getTarget('tag', e.target);

				if($element.hasClass('tag-active')){
					$element.removeClass('tag-active');
				}
				else {
					$element.addClass('tag-active');
				}
			});
		});

		$('#btn-add-tag-selection').click(function(e){
			$('#tag-selection > .tag-active').each((index, ele) => {
				$(ele).removeClass('tag-active');
				if($('#list-display > .tags-container > .tag[data-property="' + $(ele).attr('data-property') + '"]').length == 0){
					$(ele).find('.badge').remove();
					$(ele).off('click');
					$(ele).append('<span class="btn-remove-tag">x</span>');
					$('#btn-add-tag').before(ele);
					$('#modal-tag-selection').modal('hide');
				}
			});
			updateListDisplay();
		});

		$(window).on('resize', function(e){
			updateNameScroll();
			$(':root').css({'--vh': window.innerHeight / 100 + 'px'});
		});

		$(document).on('click', '.btn-remove-tag', function(e){
			$(e.target).parent().remove();
			updateListDisplay();
		});

		$(document).on('click', '.name-card', function(e){
			const index = parseInt($getTarget('name-card', e.target).attr('data-feature-index'));
			createModal(studentInfo.slice(index, index + 1));
		});

		var touching = false;

		$(document).on('touchstart', '#name-scroll > div', function(e) {
			touching = true;
			moveToDivider(e.target);
		});

		$(document).on('touchend', '#name-scroll', function(e) {
			touching = false;
		});

		$(document).on('touchmove', '#name-scroll > div', function(e){
			if(touching){
				moveToDivider(e.target);
			}
		});

		$(document).on('mousedown', '#name-scroll > div', function(e){
			moveToDivider(e.target);
		});

		function moveToDivider(nameScrollElement) {
			var $target = $('#names-view > .divider:contains("' + $(nameScrollElement).text() + '")');
			if($target.length > 0){
				$('#list-display').stop();
				$('#list-display').animate({'scrollTop':$('#list-display').scrollTop() + $target.offset().top - parseFloat($(window).height())/10},100);
			}
		}


		function $getTarget(className, ele){
			// Make sure the tag element is selected
			$element = $(ele);
			while(!$element.hasClass(className) && $element[0] != $('body')[0]){
				$element = $element.parent();
			}
			return $element;
		}

		function updateNameScroll() {
			$('#name-scroll > div').remove();
			for(var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++){
				if($('#names-view > .divider:contains("' + String.fromCharCode(i) + '")').length > 0){
					var $temp = $('<div>' + String.fromCharCode(i) + '</div>');
					$('#name-scroll').append($temp);
				}
			}
			$('#name-scroll > div').css('height',  parseFloat($('#name-scroll').css('height'))/$('#name-scroll > div').length + 'px');
		}

		function updateListDisplay(){
			$('#names-view .name-card,.divider').remove();
			var propertyFilters = {};
			var filtersNameList = [];
			$('#list-display .tag').each((i, element) => {
				const propertyName = $(element).attr('data-property-name')
				const property = $(element).attr('data-property')
				if(propertyName != undefined && property != undefined){
					if(propertyFilters[propertyName] == undefined){
						propertyFilters[propertyName] = [];
						filtersNameList.push(propertyName);
					}
					propertyFilters[propertyName].push(property);
				}
			});

			var alphaOrder = 'a'.charCodeAt(0);
			studentInfo.forEach((feature, index) => {
				var filtersSatisfied = 0;
				filtersNameList.forEach(name => {
					if(propertyFilters[name].some(propertyFilter => {
						return (FeatureText.propertyNameToFunc(name))(feature) == propertyFilter;
					})){
						filtersSatisfied++;
					}
				});
				function matchFirstLetter(str, letter){
						const result = PinyinMatch.match(str, letter)
						return result != false && result[0] == 0;
				}
				if(filtersSatisfied == filtersNameList.length){
					const name = feature.properties.NameCN;
					if(alphaOrder == 'a'.charCodeAt(0) || !(matchFirstLetter(name, String.fromCharCode(alphaOrder)))){
						for(;alphaOrder <= 'z'.charCodeAt(0); alphaOrder++){
							if(matchFirstLetter(name, String.fromCharCode(alphaOrder))){
								$('#names-view').append('<div class="divider">' + String.fromCharCode(alphaOrder).toUpperCase() +'<span></span></div>');
								break;
							}
						}
					}
					temp = '<div class="name-card" data-feature-index=' + index + '>'
										+ FeatureText.name(feature)
							+ '</div>';
					$('#names-view').append(temp);
					//$('#names-view').append('<div class="name-card tag">' + FeatureText.name(feature) + '</div>');
				}
			});
			updateNameScroll()
		}

		// class with static functions to display text according to current language setting
		class FeatureText {

			static propertyNameToFunc(propertyName){
				switch(propertyName){
					case 'Class':
						return FeatureText.class_;
						break;
					case 'School':
						return FeatureText.school;
						break;
					case 'Major':
						return FeatureText.major;
						break;
					case 'CountryRegion':
						return FeatureText.countryRegion;
						break;
					case 'Region':
						return FeatureText.region;
						break;
					case 'City':
						return FeatureText.city;
						break;
				}
			}

			// Returns a sorted array consist of a certain list of properties
			// and the corresponding count of features having the property among the given features
			static getPropertiesFromFeatures(features, propertyName){
				var properties = [];
				var propertiesDict = {};
				var getText = FeatureText.propertyNameToFunc(propertyName);

				for(var i = 0; i < features.length; i++){
					if(getText(features[i]).trim() == '') continue;
					if(propertiesDict[getText(features[i])] >= 0){
						// If the given property exisits in the records
						const index = propertiesDict[getText(features[i])];
						properties[index]['count']++;
					}
					else {
						propertiesDict[getText(features[i])] = properties.length;
						properties.push({'property': getText(features[i]), 'count': 1}, );
					}
					properties.push();
				}
				properties.sort((a, b) => (Math.sign(b.count - a.count)));

				return properties;
			}

			static name(feature) {
				switch (lang) {
					case 0:
						return feature.properties.NameCN;
					case 1:
						const name = feature.properties.NameEN;
						return name.slice(name.indexOf(' ') + 1) + ', ' + name.slice(0, name.indexOf(' '));
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

			static countryRegion(feature) {
				switch (lang) {
					case 0:
						return feature.properties.CountryRegionCN;
					case 1:
						return feature.properties.CountryRegionEN;
				}
			}

			static region(feature) {
				switch (lang) {
					case 0:
						return feature.properties.RegionCN;
					case 1:
						return feature.properties.RegionEN;
				}
			}

			static city(feature) {
				switch (lang) {
					case 0:
						return feature.properties.CityCN;
					case 1:
						return feature.properties.CityEN;
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

			static chooseFilter() {
				switch(lang){
					case 0:
						return "选择分类";
					case 1:
						return "Choose a filter";
				}
			}

			static filter() {
				switch(lang){
					case 0:
						return "筛选";
					case 1:
						return "Filter";
				}
			}

			static listHintMsg() {
				switch(lang){
					case 0:
						return "点击名字查看个人名片";
					case 1:
						return "Click on names to view personal profile.";
				}
			}

			static addTagHintMsg() {
				switch(lang){
					case 0:
						return "点击选择要添加的标签";
					case 1:
						return "Click on tags to add.";
				}
			}

			static modalConfirmHintMsg() {
				switch(lang){
					case 0:
						return "切换语言会清除现有的标签，是否继续？";
					case 1:
						return "Switching language will remove all filters. Continue?";
				}
			}

			static modalAddTagTitleMsg() {
				switch(lang){
					case 0:
						return "添加标签";
					case 1:
						return "Add Filter"
				}
			}

			static mapDownloadLinkHintMsg() {
				switch(lang) {
					case 0:
						return "下载原图 (19.6 MB)";
					case 1:
						return "Download Full Image (19.6 MB)";
				}
			}

			static helperMsg() {
				switch(lang){
					case 0:
						return '<li class="text-danger">为保障信息安全及所有在册学生的隐私，禁止向任何人泄露您的个人账号和密码。</li>'
									+ '<li>点击<i class="fa fa-bars"></i>可查看完整通讯录；</li>'
								  + `<li>在搜索框里输入关键词，例如输入“${(curriculum == Curriculum.INTERNATIONAL)?"NYU":"中山大学"}”搜索所有在${(curriculum == Curriculum.INTERNATIONAL)?"NYU":"中山大学"}上学的同学；</li>`
								  + `${(curriculum == Curriculum.INTERNATIONAL)?"<li>点击右下角按钮可以切换中文/英文；</li>":""}`
								  + `${(curriculum == Curriculum.INTERNATIONAL)?'<li>点击<i class="fa fa-map"></i>查看<i>Where We Go 2020</i>&nbsp静态地图，查看同学们的毕业去向；</li>':""}`
								  + `${(curriculum == Curriculum.INTERNATIONAL)?"<li>(Gapping)/(Deferring)标签标注出了在2020-2021学年中选择Gap/Defer的同学；</li>":""}`
								  + `<li>缩放地图可查看学校在所处城市中的精确定位，这在学校分布密集的城市尤有帮助，例如${(curriculum == Curriculum.INTERNATIONAL)?'美国东北部地区；</li>':'广东地区；'}`
								  + '<li>本地图为不完全统计，个人信息以自愿为原则采集；</li>'
								  + `<li>如需更新个人信息（如${(curriculum == Curriculum.INTERNATIONAL)?"就读学校、休学状态":"手机号、就读专业"}），或者投诉与建议，请联系微信账号jychen630；</li>`;
					case 1:
						return '<li>Click on<i class="fa fa-bars"></i>to view all contacts.</li>'
								  + '<li>Type in key words to search specific contacts; e.g Type in "NYU" to search all students going to NYU.</li>'
								  + '<li>Click the "中/EN" button in the bottom right corner to switch languages.</li>'
								  + '<li>Click on<i class="fa fa-map"></i>to view&nbsp<i>Where We Go 2020</i>&nbspstatic map and check where everyone goes to.</li>'
								  + '<li>(Gapping)/(Deferring) labels the students who gap/defer the 2020-2021 school year.</li>'
								  + '<li>Zoom in the map to view precise location of institutions (within city).</li>'
								  + '<li>Locations of students not yet made a decision are temporarily set as Shenzhen.</li>'
								  + '<li>All Infomation are collected with full free will, and are presented with grant in advance.</li>'
								  + '<li>To update your infomation (such as schools or gapping/deferring status), share advice or make complaint, please contact Jaelyn Chen (WeChat ID jychen630).</li>'
				}
			}

			static helperTitle() {
				switch(lang) {
					case 0:
						return "帮助";
					case 1:
						return "Help";
				}
			}

			static modalMapTitle() {
				switch(lang) {
					case 0:
						return "毕业地图";
					case 1:
						return "Graduation Map";
				}
			}

			static filterSchool(){
				switch(lang){
					case 0:
						return "学校";
					case 1:
						return "School";
				}
			}

			static filterMajor(){
				switch(lang){
					case 0:
						return "专业";
					case 1:
						return "Major";
				}
			}

			static filterClass(){
				switch(lang){
					case 0:
						return "班级";
					case 1:
						return "Class";
				}
			}

			static filterCountryRegion(){
				switch(lang){
					case 0:
						return "国家/地区";
					case 1:
						return "Country/Region";
				}
			}

			static filterRegion(){
				switch(lang){
					case 0:
						return `${(curriculum == Curriculum.INTERNATIONAL)?"州/郡/省":"省"}`;
					case 1:
						return "Region";
				}
			}

			static filterCity(){
				switch(lang){
					case 0:
						return "城市";
					case 1:
						return "City";
				}
			}

			static filterSchool(){
				switch(lang){
					case 0:
						return "学校";
					case 1:
						return "School";
				}
			}

			static cancel() {
				switch(lang){
					case 0:
						return "取消";
					case 1:
						return "Cancel";
				}
			}

			static confirm() {
				switch(lang){
					case 0:
						return "确定";
					case 1:
						return "Confirm";
				}
			}

			static location(feature) {
				return feature.properties.CountryRegion + feature.properties.Region + feature.properties.City;
			}
		}
