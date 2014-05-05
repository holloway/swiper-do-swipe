(function($){
	"use strict";

    var defaults = {
            page_turn_at: 50, // horizontally, in pixels
            page_turn_animate_at: 10, // horizontally, in pixels
            begin_scroll_at: 10, // begin scrolling, in pixels
            page_scroll_at: 10 //vertically, in pixels
        };

    // Call swiper_do_swipe() with these parameters,
    // $pages is an array of elements (not jQuery object, not nodeList - see index.html for how to do this if you want help),
    // style is value in swiper_do_swipe_styles (below) e.g. swiper_do_swipe_styles.perspective
    // and options override the defaults (optional)
    window.swiper_do_swipe = function($pages, style, options, onchange_callback){
        var property,
            _this;

        if($pages.jquery){
            $pages = $pages.get();
        } else if($pages instanceof NodeList){
            $pages = nodelist_to_array($pages);
        }
            
        options = options || {};
        for (property in defaults) {
            if (options.hasOwnProperty(property)) continue;
            options[property] = defaults[property];
        }

        _this = {
            version: 0.1,
            options: options,
            $pages:  $pages,
            index: 0,
            style: style,
            init: function(){
                this.init_$pages();
                this.init_events();
                this.move_to_page(0);
            },
            onchange: function(callback){
                _this.on("change", callback);
            },
            on: function(event_type, callback){
                if(!_this._on_callbacks) _this._on_callbacks = {};
                if(!_this._on_callbacks[event_type]) _this._on_callbacks[event_type] = [];
                _this._on_callbacks[event_type].push(callback);
            },
            trigger: function(event_type){
                if(!_this._on_callbacks || !_this._on_callbacks[event_type]) return;
                var callback;
                for(var i = 0; i < _this._on_callbacks[event_type].length; i++){
                    callback = _this._on_callbacks[event_type][i];
                    callback.apply(_this, arguments);
                }
            },
            init_$pages: function(){
                _this.$pages.map(function($page, i){
                    $page.style.display   = "block";
                    $page.style.minHeight = "100%";
                    $page.scroll_y = 0;
                    $page.style.width     = "100%";
                    $page.style.minWidth  = "100%";
                    $page.style.position  = "absolute";
                    $page.style.overflow  = "hidden";
                    $page.style[css.transform_style] = "preserve-3d";
                    if(_this.style.page_move_end) $page.addEventListener(css.transition_end, _this.style.page_move_end);
                });
            },
            init_events: function(){
                document.addEventListener('scroll',     prevent_default,   false);
                document.addEventListener('touchstart', _this.touch.start, false);
                document.addEventListener('touchmove',  _this.touch.move,  false);
                document.addEventListener('touchend',   _this.pointer.end, false);
                document.addEventListener('mousedown',  _this.mouse.start, false); // note these mouse events are removed if touch.start is called once
                document.addEventListener('mousemove',  _this.mouse.move,  false);
                document.addEventListener('mouseup',    _this.pointer.end, false);
            },
            pointer: { //a wrapper for touch/mouse interactions
                dragging: false,
                drag_direction: false,
                animation_id: undefined,
                current_style: undefined,
                start: function(event){
                    var pointer = _this.pointer,
                        $page_before = _this.$pages[_this.index - 1],
                        $page_after  = _this.$pages[_this.index + 1];

                    pointer.dragging = true;
                    pointer.drag.distance.x = 0;
                    pointer.drag.distance.y = _this.$pages[_this.index].scroll_y;
                    pointer.drag_direction = false;
                    if($page_before) {
                        $page_before.scroll_y = 0;
                        $page_before.style.marginTop = 0;
                    }
                    if($page_after) {
                        $page_after .scroll_y = 0;
                        $page_after.style.marginTop = 0;
                    }
                    if(pointer.animation_id){
                        window.cancelAnimationFrame(pointer.animation_id);
                    }
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                },
                move: function(event){
                    var pointer     = _this.pointer,
                        distance    = pointer.drag.distance,
                        $page_current = _this.$pages[_this.index];

                    distance.y += $page_current.scroll_y;
                    if(pointer.drag_direction !== false) return;
                    if(Math.abs(distance.x) > _this.options.page_turn_animate_at){
                        pointer.drag_direction = "horizontal";
                        if(_this.style.reduce_size_during_horizontal_scroll !== false) _this.reduce_size_before_horizontal_scroll();
                        if(_this.style.before_horizontal) _this.style.before_horizontal(_this.$pages, _this.index);
                    } else if(Math.abs(distance.y - $page_current.scroll_y) > _this.options.begin_scroll_at) {
                        pointer.drag_direction = "vertical";
                        $scrollbar.classList.add("animate");
                        $scrollbar.classList.add("on");
                        $page_current.scroll_limit = $page_current.offsetHeight - window_height;
                        $page_current.scrollbar_ratio = (window_height - $scrollbar.offsetHeight - scrollbar_buffer) / $page_current.scroll_limit;
                    }
                },
                animate: function(){ //called under a requestAnimationFrame at ~60fps, initially from pointer.start
                    var pointer  = _this.pointer,
                        distance = pointer.drag.distance,
                        $page;

                    switch(pointer.drag_direction){
                        case "horizontal":
                            if(_this.style.horizontal) _this.style.horizontal(pointer, distance.x, $pages, _this.index);
                            break;
                        case "vertical":
                            $page = _this.$pages[_this.index];
                            if(distance.y < 0) {
                                 distance.y = 0;
                            } else if (distance.y > $page.scroll_limit) {
                                distance.y = $page.scroll_limit;
                            }
                            $page.style[css.transform] = "translateY(" + -distance.y + "px)";
                            $scrollbar.style[css.transform] = "translateY(" + (distance.y * $page.scrollbar_ratio) + "px)";
                            break;
                    }
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                },
                end: function(event){
                    var index    = _this.index,
                        pointer  = _this.pointer,
                        distance = pointer.drag.distance,
                        $page_current;

                    pointer.dragging = false;
                    window.cancelAnimationFrame(pointer.animation_id);
                    pointer.animation_id = undefined;
                    switch(pointer.drag_direction){
                        case "horizontal":
                            if(_this.style.reduce_size_during_horizontal_scroll !== false) _this.restore_size_after_horizontal_scroll();
                            if(_this.style.after_horizontal) _this.style.after_horizontal(_this.$pages, index);
                            if(Math.abs(pointer.drag.distance.x) >= _this.options.page_turn_at) {
                                index += (pointer.drag.distance.x < 0) ? -1 : 1;
                                _this.trigger("change", _this.$pages[index], index);
                                _this.move_to_page(index);
                            } else {
                                $page_current = _this.$pages[index];
                                $page_current.style[css.transform] = "translateY(" + -$page_current.scroll_y + "px)";
                                //_this.move_to_page(index);
                            }
                            break;
                        case "vertical":
                            $scrollbar.classList.add("animate");
                            $scrollbar.classList.remove("on");
                            _this.$pages[index].scroll_y = pointer.drag.distance.y;
                            break;
                        default: // then the touch/click has ended without a horizontal/vertical scroll, so it's a 'click', so generate a fake event...
                            if(event.type.toLowerCase().match(/touchend/)){
                                var click_event = document.createEvent('MouseEvents');
                                var target = _this.touch.get_target(event.target);
                                click_event.initMouseEvent(_this.touch.pseudo_event(target), true, true, window, 1, event.screenX, event.screenY, event.clientX, event.clientY, false, false, false, false, 0, null);
                                click_event.forwardedTouchEvent = true;
                                target.dispatchEvent(click_event);
                            }
                    }
                    pointer.drag_direction = false;
                    pointer.drag.start.y = 0;
                    pointer.drag.start.x = 0;
                    pointer.drag.distance.x = 0;
                    pointer.drag.distance.y = 0;
                },
                drag: {
                    distance: {x:0, y:0},
                    start:    {x:0, y:0}
                }
            },
            touch: {
                start: function(event){
                    event.preventDefault(); // yes android swiping is that broken http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                    document.removeEventListener('mousedown', _this.mouse.start);
                    document.removeEventListener('mousemove', _this.mouse.move);
                    document.removeEventListener('mouseup',   _this.pointer.end);
                    _this.pointer.drag.start.x = event.touches[0].clientX;
                    _this.pointer.drag.start.y = event.touches[0].clientY;
                    _this.pointer.start(event);
                },
                move: function(event){
                    if(!_this.pointer.dragging) return;
                    event.preventDefault(); // yes android swiping is that broken http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                    var pointer = _this.pointer;
                    pointer.drag.distance.x = pointer.drag.start.x - event.touches[0].clientX;
                    pointer.drag.distance.y = pointer.drag.start.y - event.touches[0].clientY;
                    pointer.move(event);
                },
                get_target: function(target){
                    if (target.nodeType === Node.TEXT_NODE) return target.parentNode;
                    return target;
                },
                pseudo_event: function(target) {
                    if(is_android && target.tagName.toUpperCase() === 'SELECT') {
                        return 'mousedown';
                    }
                    return 'click';
                }
            },
            mouse: {
                dragging: false,
                start: function(event){
                    var position = _this.mouse.position(event),
                        pointer  = _this.pointer;

                    event.preventDefault();
                    pointer.drag.start.x = position.x;
                    pointer.drag.start.y = position.y;
                    pointer.start(event);
                },
                move: function(event){
                    var pointer  = _this.pointer,
                        position;

                    if(!pointer.dragging) return;
                    event.preventDefault();
                    position = _this.mouse.position(event);
                    pointer.drag.distance.x = pointer.drag.start.x - position.x;
                    pointer.drag.distance.y = pointer.drag.start.y - position.y;
                    pointer.move(event);
                },
                position: function(event){
                    return {
                        x: event.x || event.clientX,
                        y: event.y || event.clientY
                    };
                }
            },
            move_to_page: function(i){
                var $pages = _this.$pages;
                
                i = Math.max(Math.min(i, $pages.length - 1), 0); // make sure we're not exceeding the range of $pages
                _this.style.move_to_page($pages, i);
                _this.index = i;
            },
            reduce_size_before_horizontal_scroll: function(){
                var $page_current = _this.$pages[_this.index],
                    $page_before =  _this.$pages[_this.index - 1],
                    $page_after  =  _this.$pages[_this.index + 1];

                $page_current.style.height    = window_height - 25 + "px"; //because this shows the box edges more. This number is arbitrary (change it if you want) but it's a noticible amount of pixels (not too few to be annoying on mobile)
                $page_current.style.minHeight = window_height - 25 + "px";
                $page_current.scrollTop = $page_current.scroll_y;
                if($page_before){
                    $page_before.style.height    = window_height - 5 + "px"; //because this shows the box edges more. This number is arbitrary (change it if you want) but it's a noticible amount of pixels (not too few to be annoying on mobile)
                    $page_before.style.minHeight = window_height - 5 + "px";
                    $page_before.scrollTop = $page_current.scroll_y;
                }
                if($page_after){
                    $page_after.style.height    = window_height - 50 + "px"; //because this shows the box edges more. This number is arbitrary (change it if you want) but it's a noticible amount of pixels (not too few to be annoying on mobile)
                    $page_after.style.minHeight = window_height - 50 + "px";
                    $page_after.scrollTop = $page_current.scroll_y;
                }
            },
            restore_size_after_horizontal_scroll: function(){
                var $page_current = _this.$pages[_this.index],
                    $page_before =  _this.$pages[_this.index - 1],
                    $page_after  =  _this.$pages[_this.index + 1];

                $page_current.scrollTop = 0;
                $page_current.style.height = "auto";
                $page_current.style.minHeight = "100%";
                if($page_before) {
                    $page_before.style.height    = "auto";
                    $page_before.style.minHeight = "100%";
                }
                if($page_after) {
                    $page_after.style.height    = "auto";
                    $page_after.style.minHeight = "100%";
                }
            },
            dispose: function(){
                document.removeEventListener('scroll',     prevent_default);
                document.removeEventListener('touchstart', _this.touch.start);
                document.removeEventListener('touchmove',  _this.touch.move);
                document.removeEventListener('touchend',   _this.pointer.end);
                document.removeEventListener('mousedown',  _this.mouse.start);
                document.removeEventListener('mousemove',  _this.mouse.move);
                document.removeEventListener('mouseup',    _this.pointer.end);
            }
        };
        _this.init();
        if(onchange_callback) _this.onchange(onchange_callback);
        return _this;
    };

    window.swiper_do_swipe_styles = {};

    var tf = function(fn, context){ // tf stands for this_function
        context = context || this;
        if(fn === undefined) { console.trace(); alert("Error: this_function called with non-existant function. See console.log"); return; }
        return function(){
            var args = arguments;
            return fn.apply(context, args);
        };
    };

    var prevent_default = function(event){
        event.preventDefault();
    };

    var recalculate_window_dimensions = function(){ //is this even faster than direct access? TODO: benchmark this
        window.window_width =  window.innerWidth;
        window.window_height = window.innerHeight;
    };
    window.addEventListener('resize', recalculate_window_dimensions, false);
    recalculate_window_dimensions();

    var is_android = navigator.userAgent.match(/Android/i);

    var has_touch = 'ontouchstart' in document.documentElement;

    window.find_css_name = function(attempts){
        var element = document.createElement('fakeelement'),
            key;
        for(key in attempts){
            if(element.style[key] !== undefined){
                return attempts[key];
            }
        }
    };

    window.css = {
         transform: find_css_name({
            transform:       'transform',
            OTransform:      '-o-transform',
            MozTransform:    '-moz-transform',
            msTransform:     '-ms-transform',
            webkitTransform: '-webkit-transform'
        }),
        transition_end: find_css_name({
            transition:       'transitionend',
            OTransition:      'otransitionEnd',
            MozTransition:    'transitionend',
            MSTransition:     'msTransitionEnd',
            WebkitTransition: 'webkitTransitionEnd'
        }),
        transform_origin: find_css_name({
            transformOrigin:       'transform-origin',
            OTransformOrigin:      '-o-transform-origin',
            MozTransformOrigin:    '-moz-transform-origin',
            msTransformOrigin:     '-ms-transform-origin',
            webkitTransformOrigin: '-webkit-transform-origin'
        }),
        transform_style: find_css_name({
            transformStyle:       "transform-style",
            OTransformStyle:      "-o-transform-style",
            mozTransformStyle:    "-moz-transform-style",
            msTransformStyle:     "-ms-transform-style",
            webkitTransformStyle: "-webkit-transform-style"
        })
    };

    (function() { // via except without stupid 'element' variable http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
        var lastTime = 0;
        var vendors = ['webkit', 'moz'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame =
              window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    var scrollbar_animation_end = function(){
        $scrollbar.classList.remove("animate");
    };

    var nodelist_to_array = function(node_list){
        return Array.prototype.slice.call(node_list);
    };

    var $scrollbar = document.createElement("div");
    document.body.appendChild($scrollbar);
    $scrollbar.className = "swiper-do-swipe-scrollbar";
    $scrollbar.addEventListener(css.transition_end, scrollbar_animation_end);
    var scrollbar_buffer = 20; // 10 pixels from top and bottom = 20 total


}());