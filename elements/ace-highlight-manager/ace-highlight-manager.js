/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	(function(){

	'use strict';

	var Heatmap = __webpack_require__(1) 
	var Range = ace.require('ace/range').Range
		, comparePoints = Range.comparePoints;

		Polymer('ace-highlight-manager', {

			created: function(){
				 // editor
				 this.MODE_HIGHLIGHT = 'modeHighlight';
				 this.MODE_EDIT_TEXT = 'modeEditText';
				 this.MODE_HEATMAP   = 'modeHeatmap';

				 this.modes = Object.create(null);
				 this.mode = 'modeHeatmap';

				 this.defaultOptions = {
				   syntax: 'java',
				   mode: this.MODE_HEATMAP
				 };

				this.settings = this.defaultOptions

				 //highlight modes
				 this.HIGHLIGHT_COLOR = 'highlightColor';
				 this.HIGHLIGHT_ERASE = 'highlightErase';

				 this.highlightMode = this.HIGHLIGHT_COLOR;

				 this.colors = [{
				   "color": "d9534f",
				   "name" :'bootstrapred'
				 },
				 {
				   "color": "428bca",
				   "name" : 'blue'
				 },
				 {
				   "color": "5cb85c",
				   "name" : 'green'
				 }];

				 this.rangeItems = [];
				 this.occurenceItems = [];
				 this.heatmapItems = [];
				 this.heatmapData = {};
				 this.aceEditSession = null;
				 this.selectionColor = this.colors[0];
				 this.oldRange = null;
				 this.oldstart = null;
				 this.lastMarker = null;
				 this.rangeIdPrefix = 'he-range-item-';
			},

			ready: function(){
				if(this.editor){
					this.init();
				}
			},

			editorChanged: function(){
				if(this.editor){
					// TODO: clean previous work
					this.init();
				}
			},

			init: function(){
		    this.modes[this.MODE_EDIT_TEXT] = this.setInEditTextMode.bind(this);
		    this.modes[this.MODE_HEATMAP] = this.setInHeatmapMode.bind(this);
		    this.modes[this.MODE_HIGHLIGHT] = this.setInHighlightMode.bind(this);

		    this.clearSelectionBinded = this.clearSelection.bind(this);
		    this.onChangeSelectionBinded = this.onChangeSelection.bind(this);
		    
		    ///setup ace editor
		    this.aceEditSession = this.editor.getSession()
		    this.aceEditSession.setMode('ace/mode/'+this.settings.syntax.toLowerCase());

		    this.modes[this.mode]();
			},

			clearSelection: function(){
		  	this.aceEditSession.selection.clearSelection();
			},

		  /**
		  * merge specific color
		  * 
		  */
		  mergeColor: function(colorName){
		    var ranges = this.getHighlightRanges();
		    if(! ranges[colorName]) return;

		    var removed = this.merge(ranges[colorName]);

	      removed.forEach( function(r){
	        this.aceEditSession.removeMarker(r.id)
	        this.removeRangeItemByMarkerId(r.id)
	      }.bind(this));

	      ranges[colorName].forEach(function(r){
	        var marker = this.aceEditSession.getMarkers()[r.id]
	          , text = this.aceEditSession.getTextRange(marker.range);

	       this.updateRangeItemTextByMarkerId(r.id, text);

	      }.bind(this));
		  },

		  /**
		  * merge all by color
		  * 
		  */
		  mergeByColor: function(){
		  	this.colors.forEach(function(color){
		  		 this.mergeColor(color.color);
		  		}.bind(this));
		  },

		  /**
		  * merge overlapping ranges
		  * 
		  */
		  merge: function(list) {
		    var removed = [];
		    
		    list = list.sort(function(a, b) {
		        return comparePoints(a.start, b.start);
		    });
		    
		    var next = list[0], range;
		    for (var i = 1; i < list.length; i++) {
		        range = next;
		        next = list[i];
		        var cmp = comparePoints(range.end, next.start);
		        if (cmp < 0)
		            continue;

		        if (cmp == 0 && !range.isEmpty() && !next.isEmpty())
		            continue;

		        if (comparePoints(range.end, next.end) < 0) {
		            range.end.row = next.end.row;
		            range.end.column = next.end.column;
		        }

		        list.splice(i, 1);
		        removed.push(next);
		        next = range;
		        i--;
		    }

		    return removed;
		  },

		  getMarkerColorName: function(marker){
		    var s =marker.clazz
		      , hclass="ace_highlight marker-";

		    return s.substring((s.indexOf(hclass) + hclass.length),s.length);
		  },

		  getOccurences: function(){
		    var markers = this.getHighlightMarkers()
		      , occurences = {};

		    this.colors.forEach(function(c){
		      occurences[c.color] = {};
		    });

		    markers.forEach(function(marker){
		      var colorName = this.getMarkerColorName(marker)
		      , text = this.aceEditSession.getTextRange(marker.range)
		      , ocColor = occurences[colorName];
		      
		      if(! ocColor.hasOwnProperty(text)){
		        ocColor[text] = 0;
		      }
		      ocColor[text]++;
		    }.bind(this));

		    return occurences;
		  },

		  modeChanged: function(oldValue, newValue){
		  	if(oldValue === newValue) return;
		    if(this.modes[newValue]){
		      this.modes[newValue]();
		    }
		  },

		  setInEditTextMode: function(){
		    this.mode = this.MODE_EDIT_TEXT;
		    this.removeAllMarkers();
		    this.editor.setReadOnly(false);
		    this.aceEditSession
		      .selection.off('changeSelection', this.onChangeSelectionBinded);
		  },

		  setInHeatmapMode: function(){
		    this.mode = this.MODE_HEATMAP;
		    this.removeAllMarkers();
		    this.editor.setReadOnly(true);
		    this.aceEditSession
		      .selection.off('changeSelection', this.onChangeSelectionBinded);
		  },

		  setInHighlightMode: function(){
		    this.mode = this.MODE_HIGHLIGHT;
		    this.removeAllMarkers();
		    this.editor.setReadOnly(true);
		    this.aceEditSession
		      .selection.on('changeSelection', this.onChangeSelectionBinded);
		  },

		  /**
		  * Set Coloring or Erasing mode
		  * 
		  */
		  setHighlightMode: function (mode) {
		    if (this.highlightMode == mode) return;
		    var isColor = ((this.highlightMode = mode) == this.HIGHLIGHT_COLOR);
		  },

		 /**
		  * Adds a new Marker to the aceEditSession
		  * 
		  */
		  addMarker: function (markRange, clazz) {
		   return this.aceEditSession.addMarker(markRange, clazz, 'text', false);
		  },

		  getHighlightMarkers: function (){
				var markers = [];
				var m = this.aceEditSession.getMarkers();

				for (var k in m){
					if(m[k].clazz.indexOf("ace_highlight") != -1){
						markers.push(m[k]);
					}
				}
				return markers;
		  },

		  getHighlightRanges: function (){
		     var hMarkers = this.getHighlightMarkers()
		      , hRanges = {}
		      , self = this;

		     hMarkers.forEach(function(v){
		      var colorStr = self.getMarkerColorName(v)
		        , hclass="ace_highlight";

		      if(! hRanges.hasOwnProperty(colorStr) ){
		        hRanges[colorStr] = [];
		      }
		      hRanges[colorStr].push(v.range)
		      
		    });
		    return hRanges;
		  },


		  /**
		  * Handles changeSelection events
		  * 
		  */
		  onChangeSelection: function(e) {
		    setTimeout(function(e){
		      if (this.aceEditSession.selection.isEmpty() 
		        || isEmptyObject(this.colors)) return;
		      
		      this.highlightMode == this.HIGHLIGHT_COLOR ?   this.highlightChange() : this.eraseChange();
		    }.bind(this,e), 1)
		  },

		  highlightChange: function(){
		    var selRange = this.aceEditSession.selection.getRange()
		      , markers = this.aceEditSession.getMarkers();

		    this.lastMarker = this.addMarker(selRange, 'ace_highlight marker-' + this.selectionColor.color);
		    selRange.id = this.lastMarker;
		    this.addRangeItem(markers[this.lastMarker], this.lastMarker, this.selectionColor.color);
		    this.mergeColor(this.selectionColor.color);
		    this.populateOccurenceItems();
		  },

		  /**
		  * Remove all markers
		  * 
		  */
		  removeAllMarkers: function(){

		    var markers = this.aceEditSession.getMarkers();
		    
		    for (var id in markers){
		      if(markers[id].clazz.indexOf('ace_highlight') != -1){
		        this.aceEditSession.removeMarker(id);
		      }
		    }

		    this.rangeItems = [];
		    this.occurenceItems = [];
		    this.heatmapItems = [];
		  },


		  /**
		  * Erases Markers
		  * 
		  */
		  eraseChange: function(){
		    var eraserRange = this.aceEditSession.selection.getRange() 
		      , markers = this.getHighlightMarkers()
		      , removed = []
		      , self=this;

		    //keep in mind that 'return' statements inside
		    // forEach callbacks work as 'continue' statements
		    markers.forEach( function(m){
		      var range = m.range;

		      // can touch this (...range since they do not intersect)!
		      if (!range.intersects(eraserRange)) return;

		      if(range.isEqual(eraserRange) || eraserRange.containsRange(range)){
		        //remove range
		        self.aceEditSession.removeMarker(range.id);
		        self.removeRangeItemByMarkerId(m.id)
		        removed.push(range) 
		        return;
		      }

		      if(range.containsRange(eraserRange)){
		        //create the ending marker
		        var range2 = new Range(eraserRange.end.row, eraserRange.end.column , range.end.row , range.end.column);
		        var newMarkerId2 = self.addMarker(range2, m.clazz);
		        range2.id = newMarkerId2;
		        self.addRangeItem(self.aceEditSession.getMarkers()[newMarkerId2], newMarkerId2, self.selectionColor.color);

		        range.end.row = eraserRange.start.row;
		        range.end.column = eraserRange.start.column;
		      }else{
		        /*
		       * * `-1`: (B) begins before (A) but ends inside of (A)<br/>
		       * * `+1`: (B) begins inside of (A) but ends outside of (A)<br/>
		       * * `42`: FTW state: (B) ends in (A) but starts outside of (A) */
		        console.log("The comparison says" + range.compareRange(eraserRange))
		        switch(range.compareRange(eraserRange)){
		          case -1:
		              range.start.row = eraserRange.end.row;
		              range.start.column = eraserRange.end.column;
		            break;
		          case 1:
		              range.end.row = eraserRange.start.row;
		              range.end.column = eraserRange.start.column;
		            break;
		          case 42:
		              range.end.row = eraserRange.end.row;
		              range.end.column = eraserRange.end.column;
		            break;
		        }
		      }

		      self.aceEditSession.removeMarker(range.id);
		      self.removeRangeItemByMarkerId(m.id);
		      removed.push(range) 
		      var newMarkerId = self.addMarker(range, m.clazz)
		      range.id = newMarkerId;
		      self.addRangeItem(self.aceEditSession.getMarkers()[newMarkerId], newMarkerId, self.selectionColor.color);
		      return;

		    });

		    self.mergeByColor();
		    return removed;
		  },


		  rangeMinus: function(range1, range2) {
		    var resultstart, resultend;
		   
		    if ((range1.start.row == range2.start.row) && (range1.start.column == range2.start.column)) {
		        resultstart = minimum(range1.end, range2.end);
		        resultend = maximum(range1.end, range2.end);
		        
		    } else { //MARGARITA  do you need the if inside the else here?
		        if ((range1.end.row == range2.end.row) && (range1.end.column == range2.end.column)) {
		        resultstart = minimum(range1.start, range2.start);
		        resultend = maximum(range1.start, range2.start);
		        
		        }
		    }

		    return new Range(resultstart.row, resultstart.column,
		                     resultend.row, resultend.column);
		  },

		  populateOccurenceItems: function(){
		    var occurences = this.getOccurences();
		    this.occurenceItems = [];
		    for (var color in occurences){
		      for (var s in occurences[color]){
		        this.addOccurenceItem(color, s, occurences[color][s]);
		      }
		    }
		  },

		  addOccurenceItem: function(color, text, count) {
		    var occurenceItemObj = {
		      colorClass: 'marker-' + color,
		      summary: truncate(text, 30,'…'),
		      text: text,
		      occurences: count
		    }
		    this.occurenceItems.push(occurenceItemObj);
		  },

		  addRangeItem: function(marker, id, color) {
		    var self = this
		      , rangeString = marker.range.start.row + ':' + marker.range.start.column
		        + ' - ' + marker.range.end.row + ':' + marker.range.end.column
		      , text = this.aceEditSession.getTextRange(marker.range);

		    var rangeItemObj = {
		      id: this.rangeIdPrefix+id ,
		      colorClass: 'marker-' + color,
		      summary: truncate(text, 30,'…'),
		      text: text,
		      range: rangeString
		    }

		    this.rangeItems.push(rangeItemObj);
		  },

		  updateRangeItemTextByMarkerId: function(id, text){
		  	var items = this.rangeItems;
		  	for (var i=0, l= items.length; i<l; i++){
		  		if(items[i].id ==  this.rangeIdPrefix+id){
		  			items[i].summary = truncate(text, 30,'…');
		      	items[i].text = text;
		  			return;
		  		}
		  	}
		  },

		  removeRangeItemByMarkerId: function(id) {
		  	var items = this.rangeItems;
		  	for (var i=0, l= items.length; i<l; i++){
		  		if(items[i].id ==  this.rangeIdPrefix+id){
		  			items.splice(i, 1);
		  			return;
		  		}
		  	}
		  },

		  addHeatmapItem: function(hue){
		    var self = this;
		    var heatmapItemObj = {
		      hue: hue,
		      colorClass: 'marker-' + hue,
		      description: hue
		    }

		    this.heatmapItems.push(heatmapItemObj);
		  },

		  updateHeatmapData: function(ranges){
		  	if(! this.aceEditSession){
		  		return;
		  	}

		    this.removeAllMarkers();
		    var hmap = new Heatmap({
		      textLines: this.aceEditSession.getDocument().getAllLines()
		    });

		    // ranges = JSON.parse(ranges);
	      hmap.addHueRanges(ranges);
	      this.heatmapData = hmap.hues;

	      for(var hue in this.heatmapData){
	        this.addHeatmapItem(hue);
	      }

		    try{
		      
		     // $('heatmap-labels a.list-group-item:first').trigger('click')
		    }catch(err){
		      console.log("Error parsing ranges", err)
		    }
		  },

		  drawHeatmap: function(hue){
		  	this.removeAllMarkers();

		    if(! this.heatmapData[hue]){
		      throw new Error('no heatmatData found for hue ' + hue);
		    }
		    var hueData = this.heatmapData[hue];

		    for(var i = 0, lrow = hueData.weights.length; i < lrow; i++){
		      for(var j = 0, lcol = hueData.weights[i].length; j < lcol; j++){
		        var val = ~~(hueData.weights[i][j] * 10);
		        if(val == 0) continue;
		        var range = new Range(i, j, i, j+1);
		        this.addMarker(range, 'ace_highlight marker-' + hue + '-' + val);
		      }
		    }
		  },

		  drawSolution: function(solution){
		  	if(! this.aceEditSession){
		  		return;
		  	}

		    this.removeAllMarkers();

		    Object.keys(solution).forEach(function(key){
		    	var colorRanges = solution[key];
		    	colorRanges.forEach(function(range){
		    		var range = new Range(range.start.row, range.start.column, range.end.row, range.end.column);
		    		this.addMarker(range, 'ace_highlight marker-' + key);
		    	}.bind(this));
		    }.bind(this));
		  }

		});

		//copied from http://aganov.github.io/underscore-strings/docs/underscore.strings.html
		function truncate(string, length, truncation) {
		  length = length || 30;
		  truncation = ("undefined" == typeof truncation || truncation == null) ? '...' : truncation;
		  return (string.length > length 
		  	? string.slice(0, length - truncation.length) + truncation 
		  	: String(string));
		}

		function minimum (pos1, pos2) {
		  if (pos1.row == pos2.row){
		    return pos1.column <= pos2.column ? pos1 : pos2;
		  }

		  return pos1.row < pos2.row ? pos1 : pos2;
		}

		function maximum (pos1, pos2) {

		  if (pos1.row == pos2.row){
		    return pos1.column >= pos2.column ? pos1 : pos2;
		  }

		  return pos1.row > pos2.row ? pos1 : pos2;
		}

		function isEmptyObject( obj ) {
			var name;
			for ( name in obj ) {
				return false;
			}
			return true;
		}

	})();

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var Heatmap = module.exports = function(options){
	  this.init(options);
	}

	;(function(){

	  this.init = function(options){
	    this.hues = Object.create(null);
	    this.emptyLinesArray = options.textLines.slice(0);

	    //replace text in textlines with an array of 0 to measure frequency
	    var i = options.textLines.length;
	    var lol;
	    while(i--){

	      this.emptyLinesArray[i] = [];
	      var j = options.textLines[i].length;
	      while(j--){
	        this.emptyLinesArray[i].push(0);
	      }
	    }
	  }

	  this.addHueRanges = function(ranges){
	    if(! (ranges instanceof Array) ){
	      throw new Error("ranges argument should be an array");
	    }
	    var i = ranges.length;
	    while(i--){
	      this.addRange(ranges[i]);
	    }      
	  };

	  this.addRange = function(hueRanges){
	    for (var key in hueRanges){
	      if(hueRanges.hasOwnProperty(key)){
	        this.addRangesForHue(key, hueRanges[key])
	      }
	    }
	  }

	  this.addRangesForHue = function(hue, ranges){
	    if("undefined" === typeof hue || "string" != typeof hue){
	      throw new Error('argument hue should be a valid string');
	    }
	    if("undefined" === typeof ranges 
	      || ! (ranges instanceof Array) 
	      || ! ranges.length ){
	        throw new Error('argument ranges should be a valid Array instance');
	    }

	    if(! this.hues[hue]){
	      this.hues[hue] = { weights: this.emptyLinesArray.slice(0), n : 0}
	    }


	    var hueWeights = this.hues[hue].weights
	      , n = ++this.hues[hue].n
	      //, i = ranges.length;
	      , rIndex = 0
	      , range = ranges[rIndex];


	    // ranges are ordered so we go thrould all the text lines adding ones if the current
	    // range containes the current index and zeros if the current index is between two
	    // not overlapping ranges
	    for(var i = 0, lrow = hueWeights.length; i < lrow; i++){
	      // check if we need to move to the next range based on row
	      if (range.end.row < i && rIndex < (ranges.length - 1)){
	        range = ranges[++rIndex];
	      }

	      for (var j=0, lcol = hueWeights[i].length; j < lcol; j++){
	        // check if we need to move to the next range based on column
	        if (range.end.row == i && range.end.column < j && (rIndex < ranges.length - 1)){
	          range = ranges[++rIndex];
	        }

	        //check if element is between range
	        if(i >= range.start.row && i <= range.end.row && j >= range.start.column && j <= range.end.column){
	          hueWeights[i][j] = hueWeights[i][j] + (1 - hueWeights[i][j]) / n;
	        }else{
	          hueWeights[i][j] = hueWeights[i][j] -  hueWeights[i][j] / n;
	        }

	      }
	    }
	  };


	}).call(Heatmap.prototype);
	    


/***/ }
/******/ ])