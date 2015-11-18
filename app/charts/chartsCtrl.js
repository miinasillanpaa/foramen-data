(function(){
    'use strict';
    /*global $:false, jQuery:false */

    angular.module('charts', ['angularCharts', 'angularMoment'])

    .controller('ChartsController', ['$scope', '$rootScope', '$filter', '$log', 'dataFactory', '$timeout',
        function($scope, $rootScope, $filter, $log, dataFactory, $timeout){

        $scope.showGameComparison = false;
        $scope.showPlayBars = false;
        $scope.showWeekPlayBars = true;
        $scope.chartError = false;
        $scope.multiple = false;

        $scope.playBarsData = {};
        $scope.weekPlayBarsData = {};
        $scope.gameComparisonData = {};

        $scope.modalDataLoading = true;

        $scope.initCharts = function(){

            var user = dataFactory.getUser();
            $log.log('charts init', user);
            $scope.chartsParsingStarted = moment();

            $timeout(function(){
                $scope.drawCharts(user);
            },250);
        };

        $scope.createBarData = function(labels, plays, data, stringIdentifier){

            if (stringIdentifier === 'days') {
              _.each(labels, function(label){
                  var dataObj = {
                      "x": label,
                      "y": [ plays[label] ],
                      "tooltip": moment(label, ['DD.MM.YYYY']).format('DD.MM.YYYY, dddd') + "<br/> Yhteensä harjoiteltu " + plays[label] + " kertaa"
                  };
                  data.push(dataObj);
              });
            }else{
              _.each(labels, function(label){
                  var dataObj = {
                      "x": label,
                      "y": [ plays[label] ],
                      "tooltip": label + "<br/> Yhteensä harjoiteltu " + plays[label] + " kertaa"
                  };
                  data.push(dataObj);
              });
            }

        };

        var pad2 = function(number) {
          return (number < 10 ? '0' : '') + number;
        }

        $scope.drawCharts = function(user){

            var gameLabels = [], gameComparisonData = [];
            var colors = ['#E77E23', '#7E8C8D',  '#E84C3D',  '#F1C40F', '#34495E', '#9B58B5', '#3598DB', '#2ECD71', '#1BBC9B'];
            var y;
            var dayData = [], dayPlays = [],
            weekLabels = [], weekData = [], weekPlays = [];

            //create labels for days
            var dayLabels = user.overall.exerciseDays;

            _.each(user.data, function(gameData){
                //gameTitles
                var gameTitle = gameData.game;
                gameLabels.push(gameTitle);

                y = Math.round((gameData.duration/user.overall.duration)*100);

                if (isNaN(y)) {
                    $scope.chartError = true;
                    return;
                }

                if (gameData.plays.length > 0) {

                    var gameComparisonDataObj = {
                        "x": gameTitle,
                        "y": [y],
                        'tooltip': gameTitle + '<br/> Harjoitteluaika ' + y +'% <br/> Aikaa käytetty: '+ $filter('readableTime')(gameData.duration,1) +
                        ' <br/> Harjoitetta tehty: '+ gameData.plays.length + '/' +user.overall.totalPlays
                    };

                    gameComparisonData.push(gameComparisonDataObj);
                }

                //loop thru all the plays
                _.each(gameData.plays, function(play){
                    //dayplay count for day labels
                    _.each(dayLabels, function(dayLabel){

                        var parsedStartDate = moment(play.startDate, ['ddd MMM DD YYYY HH:mm:ss', 'DD.MM.YYYY']).format('DD.MM.YYYY');
                        if (parsedStartDate === dayLabel && play.playerName === user.name) {

                            if(!dayPlays[dayLabel]){
                                dayPlays[dayLabel] = 0;
                            }
                            dayPlays[dayLabel]++;

                        }
                    });

                    //check if multiple
                    if (!$scope.multiple && play.weekNum){
                        $scope.multiple = true;
                    }

                    //create weeklabels
                    if ($scope.multiple) {
                        if ( _.contains(weekLabels, 'Viikko ' + pad2(play.weekNum)) === false) {
                            weekLabels.push('Viikko ' + pad2(play.weekNum));
                        }
                    }

                });
            });

            //TODO: somehow include in previous loop?
            //TODO: should we fill the gaps in week charts? Now, no week is shown in chart if no plays

            _.each(user.data, function(gameData){
                _.each(gameData.plays, function(play){

                        if (user.name === play.playerName) {

                            var weekString = 'Viikko ' + pad2(play.weekNum);
                            if(!weekPlays[weekString]){
                                weekPlays[weekString] = 0;
                            }
                            //console.log(play);
                            weekPlays[weekString]++;

                        }

                });
            });


            //sorting dateLabel strings
            dayLabels.sort(function(d1,d2){
                if( d1.substring(3,5) < d2.substring(3,5) || (d1.substring(3,5) == d2.substring(3,5) && d1.substring(0,2) < d2.substring(0,2))){
                    return -1;
                }else if(d1.substring(3,5) > d2.substring(3,5) || (d1.substring(3,5) == d2.substring(3,5) && d1.substring(0,2) > d2.substring(0,2))){
                    return 1;
                }else{
                    return 0;
                }
            });

            weekLabels.sort(function(d1,d2){
                if (d1.substring(7,9) < d2.substring(7,9)) {
                    return -1;
                }
                if (d1.substring(7,9) > d2.substring(7,9)) {
                    return 1;
                }
                return 0;
            });

            $scope.createBarData(dayLabels, dayPlays, dayData, 'days');
            $scope.createBarData(weekLabels, weekPlays, weekData, 'weeks');

            //datas ready!
            //day play bar-chart
            $scope.playBarsConfig = {
                title: 'Harjoittelijan '+ user.name +' harjoittelukerrat ajanjaksolla '+ $rootScope.smallestDate.format('D.M.') +
                ' - '+$rootScope.largestDate.format('D.M.YYYY') + ' (yht. '+ dayLabels.length + ' harjoittelupäivää)',
                tooltips: true,
                labels: true,
                mouseover: function() {},
                mouseout: function() {},
                click: function() {},
                legend: {
                    display: false,
                    position: 'left'
                },
                isAnimate: true,
                colors: colors
            };

            $scope.playBarsData = {
                series: dayLabels,
                data: dayData
            };

            //week play bar-chart
            $scope.weekPlayBarsConfig = {
                title: 'Harjoittelijan '+ user.name +' harjoittelukerrat ajanjaksolla '+ $rootScope.smallestDate.format('D.M.') +
                ' - '+$rootScope.largestDate.format('D.M.YYYY') + ' (yht. '+ dayLabels.length + ' harjoittelupäivää)',
                tooltips: true,
                labels: true,
                mouseover: function() {},
                mouseout: function() {},
                click: function() {},
                legend: {
                    display: false,
                    position: 'left'
                },
                isAnimate: true,
                colors: colors
            };

            $scope.weekPlayBarsData = {
                series: weekLabels,
                data: weekData
            };

            //game comparison pie-chart
            $scope.gameComparisonConfig  = {
                title: 'Harjoittelijan '+ user.name + ' harjoitteluajan jakautuminen (prosentteina) ajanjaksolla '+ $rootScope.smallestDate.format('D.M.') +
                ' - '+ $rootScope.largestDate.format('D.M.YYYY'),
                tooltips: true,
                labels: true,
                mouseover: function() {},
                mouseout: function() {},
                click: function() {},
                legend: {
                    display: true,
                    position: 'left'
                },
                isAnimate: true,
                colors: colors
            };

            $scope.gameComparisonData = {
                series: gameLabels,
                data: gameComparisonData
            };


            if (!$scope.multiple) {
                $scope.showPlayBars = true;
                $scope.showWeekPlayBars = false;
            }

            $scope.modalDataLoading = false;
            var parsingFinished = moment();
            var diff = parsingFinished.diff($scope.chartsParsingStarted);
            $log.log('chart parsing took', diff +'ms');
        };
    }]);

})();
