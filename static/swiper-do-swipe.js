(function($){
	"use strict";

    var defaults = {
            page_turn_at: 50, // horizontally, in pixels
            page_turn_animate_at: 10, // horizontally, in pixels
            begin_scroll_at: 10, // begin scrolling, in pixels
            page_scroll_at: 10, //vertically, in pixels
            number_of_inertia_scroll_movements_to_capture: 5,
            stop_inertia_scrolling_at: 1,
            decrease_inertia_per_frame_by: 0.95
        };

    // Call swiper_do_swipe() with these parameters,
    // $pages is an array of elements (not jQuery object, not nodeList - see index.html for how to do this if you want help),
    // effect is value in swiper_do_swipe_effects (below) e.g. swiper_do_swipe_effects.perspective
    // and options override the defaults (optional)
    window.swiper_do_swipe = function($pages, effect, options, onchange_callback){
        var property,
            _this;

        if($pages.jquery){ //ensure that $pages is just an array of elements
            $pages = $pages.get();
        } else if($pages instanceof NodeList){
            $pages = Array.prototype.slice.call($pages);
        }

        options = options || {};
        for (property in defaults) {
            if (options.hasOwnProperty(property)) continue;
            options[property] = defaults[property];
        }

        _this = {
            version: 0.5,
            options: options,
            $pages:  $pages,
            index: 0,
            effect: effect,
            inertia_remaining: 0,
            init: function(){
                this.init_$pages();
                this.init_events();
                this.move_to_page(0);
                this.trigger("init");
            },
            onchange: function(callback){
                _this.on("change", callback);
                return _this;
            },
            oninit: function(callback){
                _this.on("init", callback);
                _this.trigger("init", _this.$pages[_this.index], _this.index);
                return _this;
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
                if(buggy_effects_on_android){
                    document.documentElement.className += " buggy-effects";
                    document.body.className += " buggy-effects";
                }
                _this.$pages.map(function($page, i){
                    $page.style.display   = "none";
                    if(buggy_effects_on_android) {
                        return;
                    }
                    $page.style.minHeight = "100%";
                    $page.scroll_y = 0;
                    $page.style.width     = "100%";
                    $page.style.minWidth  = "100%";
                    $page.style.position  = "absolute";
                    $page.style[css.transform_style] = "preserve-3d";
                    if(_this.effect.page_move_end) $page.addEventListener(css.transition_end, _this.effect.page_move_end);
                });
            },
            init_events: function(){
                document.addEventListener('touchstart', _this.touch.start, false);
                document.addEventListener('touchmove',  _this.touch.move,  false);
                document.addEventListener('mousedown',  _this.mouse.start, false); // note these mouse events are removed if touch.start is called once
                document.addEventListener('mousemove',  _this.mouse.move,  false);
                document.addEventListener('touchend',   _this.pointer.end, false);
                document.addEventListener('mouseup',    _this.pointer.end, false);
                if(buggy_effects_on_android) return;
                document.addEventListener('scroll',     prevent_default,   false);
            },
            pointer: { //a wrapper for touch/mouse interactions
                dragging: false,
                drag_direction: false,
                animation_id: undefined,
                current_style: undefined,
                start: function(event){
                    var pointer = _this.pointer,
                        $page_current = _this.$pages[_this.index],
                        $page_before = _this.$pages[_this.index - 1],
                        $page_after  = _this.$pages[_this.index + 1];

                    pointer.dragging = true;
                    pointer.drag.distance.x = 0;
                    pointer.drag.distance.y = _this.$pages[_this.index].scroll_y;
                    pointer.drag_direction = false;
                    $page_current.scroll_limit = $page_current.offsetHeight - window_height;
                    if($page_before) {
                        $page_before.scroll_y = 0;
                        $page_before.style.marginTop = 0;
                    }
                    if($page_after) {
                        $page_after.scroll_y = 0;
                        $page_after.style.marginTop = 0;
                    }
                    _this.latest_inertia_scroll_movements = [];
                    if(pointer.animation_id){
                        window.cancelAnimationFrame(pointer.animation_id);
                    }
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                },
                move: function(){
                    var pointer     = _this.pointer,
                        distance    = pointer.drag.distance,
                        $page_current = _this.$pages[_this.index];

                    distance.y += $page_current.scroll_y;
                    if(pointer.drag_direction !== false) return;
                    if(Math.abs(distance.x) > _this.options.page_turn_animate_at){
                        pointer.drag_direction = "horizontal";
                        if(buggy_effects_on_android) return;
                        if(_this.effect.reduce_size_during_horizontal_scroll !== false) reduce_size_before_horizontal_scroll(_this.$pages, _this.index, 0); // 25 is arbitrary, but this reduction in height shows the edges more
                        if(_this.effect.before_horizontal) _this.effect.before_horizontal(_this.$pages, _this.index);
                    } else if(Math.abs(distance.y - $page_current.scroll_y) > _this.options.begin_scroll_at) {
                        pointer.drag_direction = "vertical";
                        if(buggy_effects_on_android) return;
                        $scrollbar.classList.add("animate");
                        $scrollbar.classList.add("on");
                        
                        
                        $page_current.scrollbar_ratio = (window_height - $scrollbar.offsetHeight - scrollbar_buffer) / $page_current.scroll_limit;
                    }
                },
                animate: function(){ //called under a requestAnimationFrame at ~60fps, initially from pointer.start
                    var pointer  = _this.pointer,
                        distance = pointer.drag.distance,
                        $page_current;

                    if(buggy_effects_on_android) return;
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                    switch(pointer.drag_direction){
                        case "horizontal":
                            if(_this.effect.horizontal) _this.effect.horizontal(pointer, distance.x, _this.$pages, _this.index);
                            break;
                        case "vertical":
                            $page_current = _this.$pages[_this.index];
                            if(distance.y < 0) {
                                 distance.y = 0;
                            } else if (distance.y > $page_current.scroll_limit) {
                                distance.y = $page_current.scroll_limit;
                            }
                            _this.latest_inertia_scroll_movements.push(distance.y);
                            if(_this.latest_inertia_scroll_movements.length > _this.options.number_of_inertia_scroll_movements_to_capture + 1) { // +1 because we need one more entry to calculate movements
                                _this.latest_inertia_scroll_movements.shift();
                            }
                            $page_current.style[css.transform] = "translateY(" + -distance.y + "px)";
                            $scrollbar.style[css.transform] = "translateY(" + (distance.y * $page_current.scrollbar_ratio) + "px)";
                            break;
                    }
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
                            if(_this.effect.reduce_size_during_horizontal_scroll !== false) _this.restore_size_after_horizontal_scroll();
                            if(_this.effect.after_horizontal) _this.effect.after_horizontal(_this.$pages, index);
                            if(Math.abs(pointer.drag.distance.x) >= _this.options.page_turn_at) {
                                index += (pointer.drag.distance.x < 0) ? -1 : 1;
                                _this.move_to_page(index);
                            } else if(!buggy_effects_on_android) {
                                $page_current = _this.$pages[index];
                                $page_current.style[css.transform] = "translateY(" + -$page_current.scroll_y + "px)";
                            }
                            break;
                        case "vertical":
                            if(buggy_effects_on_android) return;
                            $page_current = _this.$pages[index];
                            $page_current.scroll_y = distance.y;
                            _this.inertia_scroll_start();
                            $scrollbar.classList.remove("on");
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
                    document.removeEventListener('mousedown', _this.mouse.start);
                    document.removeEventListener('mousemove', _this.mouse.move);
                    document.removeEventListener('mouseup',   _this.pointer.end);
                    
                    if(is_form_widget(event.target)) return;
                    if(!buggy_effects_on_android) event.preventDefault(); // yes android swiping is that broken http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                    _this.pointer.drag.start.x = event.touches[0].clientX;
                    _this.pointer.drag.start.y = event.touches[0].clientY;
                    _this.pointer.start(event);
                },
                move: function(event){
                    if(!_this.pointer.dragging) return;
                    if(!buggy_effects_on_android) event.preventDefault(); // yes android swiping is that broken http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                    var pointer = _this.pointer;
                    pointer.drag.distance.x = pointer.drag.start.x - event.touches[0].clientX;
                    pointer.drag.distance.y = pointer.drag.start.y - event.touches[0].clientY;
                    pointer.move();
                },
                get_target: function(target){
                    if (target.nodeType === Node.TEXT_NODE) return target.parentNode;
                    return target;
                },
                pseudo_event: function(target) {
                    if(is_android && target.tagName.toLowerCase() === 'select') return 'mousedown';
                    return 'click';
                }
            },
            mouse: {
                dragging: false,
                start: function(event){
                    var position = _this.mouse.position(event),
                        pointer  = _this.pointer;

                    if(is_form_widget(event.target)) return;
                    if(event.button === 2) return;
                    if(!buggy_effects_on_android) event.preventDefault();
                    pointer.drag.start.x = position.x;
                    pointer.drag.start.y = position.y;
                    pointer.start(event);
                },
                move: function(event){
                    var pointer  = _this.pointer,
                        position;

                    if(event.button === 2) return;
                    if(!pointer.dragging) return;
                    if(!buggy_effects_on_android) event.preventDefault();
                    position = _this.mouse.position(event);
                    pointer.drag.distance.x = pointer.drag.start.x - position.x;
                    pointer.drag.distance.y = pointer.drag.start.y - position.y;
                    pointer.move();
                },
                position: function(event){
                    return {
                        x: event.x || event.clientX,
                        y: event.y || event.clientY
                    };
                }
            },
            move_to_page: function(i){
                var $pages = _this.$pages,
                    $page_current,
                    $page_before,
                    $page_after,
                    index = _this.index;
                
                _this.index = Math.max(Math.min(i, $pages.length - 1), 0); // make sure we're not exceeding the range of $pages
                index = _this.index;
                _this.trigger("change", _this.$pages[index], index);
                if(buggy_effects_on_android){ // then avoid effects because they'll be broken
                    $page_current = $pages[index];
                    $page_before  = $pages[index - 1];
                    $page_after   = $pages[index + 1];
                    $page_current.style.display = "block";
                    if($page_before) $page_before.style.display = "none";
                    if($page_after)  $page_after.style.display  = "none";
                    return;
                }
                _this.effect.move_to_page($pages, index);
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
            inertia_scroll_start: function(){
                var acceleration = [],
                    total = 0,
                    average,
                    i;

                for(i = 1; i < _this.latest_inertia_scroll_movements.length; i++){
                    total += _this.latest_inertia_scroll_movements[i] - _this.latest_inertia_scroll_movements[i - 1];
                }
                _this.inertia_remaining = total / (_this.latest_inertia_scroll_movements.length - 1);
                _this.pointer.animation_id = window.requestAnimationFrame(_this.inertia_scroll);
            },
            inertia_scroll: function(){
                var $page = _this.$pages[_this.index];
                _this.inertia_remaining = _this.inertia_remaining * _this.options.decrease_inertia_per_frame_by;
                $page.scroll_y += _this.inertia_remaining;
                if($page.scroll_y < 0) {
                     $page.scroll_y = 0;
                } else if ($page.scroll_y > $page.scroll_limit) {
                    $page.scroll_y = $page.scroll_limit;
                }
                $page.style[css.transform] = "translateY(" + -$page.scroll_y + "px)";
                if(Math.abs(_this.inertia_remaining) > _this.options.stop_inertia_scrolling_at){
                    _this.pointer.animation_id = window.requestAnimationFrame(_this.inertia_scroll);
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

    window.reduce_size_before_horizontal_scroll = function($pages, index, reduced_by_amount){
        var $page_current = $pages[index],
            $page_before =  $pages[index - 1],
            $page_after  =  $pages[index + 1];

        if(reduced_by_amount === undefined) reduced_by_amount = 0;
        $page_current.style.height    = window_height - reduced_by_amount + "px";
        $page_current.style.minHeight = window_height - reduced_by_amount + "px";
        $page_current.scrollTop = $page_current.scroll_y;
        if($page_before){
            $page_before.style.height    = window_height - reduced_by_amount + "px";
            $page_before.style.minHeight = window_height - reduced_by_amount + "px";
            $page_before.scrollTop = 0;
        }
        if($page_after){
            $page_after.style.height    = window_height - reduced_by_amount + "px";
            $page_after.style.minHeight = window_height - reduced_by_amount + "px";
            $page_after.scrollTop = 0;
        }
    };

    window.swiper_do_swipe_effects = {};

    window.swiper_do_swipe_effects.flat = {
        horizontal: function(pointer, value, $pages, index){
            var $page_current = $pages[index],
                $page_before  = $pages[index - 1],
                $page_after   = $pages[index + 1],
                negative = (value < 0) ? -1 : 1;

            if(buggy_effects_on_android){
                return;
            }
            var page_current_value = -value;
            $page_current.style[css.transform] = "translateX(" + page_current_value + "px) ";
            if($page_before && negative < 0){
                var page_before_value = Math.abs(value / window_width);
                page_before_value = ((page_before_value * (2 - page_before_value)) * (window_width * 0.8));
                page_before_value -= window_width;
                $page_before.style[css.transform] = "translateX(" + page_before_value + "px)";
            }
            if($page_after && negative > 0){ //because we only animate either the before OR after, not both
                var page_after_value = Math.abs(value / window_width);
                page_after_value = ((page_after_value * (2 - page_after_value)) * (window_width * 0.8));
                page_after_value = page_after_value * -negative;
                page_after_value += window_width;
                $page_after.style[css.transform] = "translateX(" + page_after_value + "px)";
            }
        },
        before_horizontal: function($pages, index){ // insert quagmire.gif here
            var $page_current = $pages[index],
                $page_before =  $pages[index - 1],
                $page_after  =  $pages[index + 1];

            $page_current.style.opacity = 1;
            $page_current.style.zIndex = 2;
            $page_current.style.display = "";
            $page_current.style[css.transform_origin] = "50% 50%";
            if($page_before) {
                $page_before.style.opacity = 1;
                $page_before.style.zIndex = 2;
                $page_before.style.display = "";
            }
            if($page_after) {
                $page_after.style.opacity = 1;
                $page_after.style.zIndex = 2;
                $page_after.style.display = "";
            }
        },
        after_horizontal: function($pages, index){
            var $page_current = $pages[index],
                $page_before =  $pages[index - 1],
                $page_after  =  $pages[index + 1];

            $page_current.style.backgroundImage = "";
            if($page_before) $page_current.style.backgroundImage = "";
            if($page_after) $page_current.style.backgroundImage = "";
        },
        move_to_page: function($pages, i){
            var $page_current = $pages[i],
                $page_before  = $pages[i - 1],
                $page_after   = $pages[i + 1];

            if(this.has_been_setup && css.transition_end) {
                //because every subsequent call uses CSS transitions
                document.body.classList.add("swiper-do-swipe-css-transition");
            } else {
                this.has_been_setup = true;
            }
            $page_current.style.display = "block";
            $page_current.style[css.transform] = "translate3d(0px, 0px, 0) rotateY(0deg) translateY(" + -$page_current.scroll_y + "px)";
            $page_current.style.opacity = 1;
            $page_current.style.zIndex = 2;
            if($page_before){
                $page_before.style.display = "block";
                $page_before.style[css.transform] = "translate3d(-100%, 0px, 0) rotateY(-90deg) translate3d(-100%, 0, 0)";
                $page_before.style.opacity = 0;
                $page_before.style.zIndex = 1;
            }
            if($page_after){
                $page_after.style.display = "block";
                $page_after.style[css.transform] = "translate3d(100%, 0px, 0) rotateY(90deg) translate3d(-100%, 0, 0)";
                $page_after.style.opacity = 0;
                $page_after.style.zIndex = 1;
            }
            if(i > 2) {
                $pages.slice(0, i - 2).map(function($page){
                    $page.style.display = "none";
                });
            }
            if(i < $pages.length - 2){
                $pages.slice(i + 2).map(function($page){
                    $page.style.display = "none";
                });
            }
        },
        page_move_end: function(){
            document.body.classList.remove("swiper-do-swipe-css-transition");
        }
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

    var ua = navigator.userAgent;

    var is_android = ua.match(/Android/i);

    var buggy_effects_on_android = function(){ //because translateX breaks form widget events on Android 2.x
        if(!is_android) return false;
        var match = ua.match(/Android\s([0-9\.]*)/);
        var version = match ? parseFloat(match[1]) : false;
        if(version && version < 3) return true;
        return false;
    }();

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
            webkitTransform: '-webkit-transform',
            mozTransform:    '-moz-transform',
            OTransform:      '-o-transform',
            msTransform:     '-ms-transform',
            transform:       'transform'
        }),
        transition_end: find_css_name({
            WebkitTransition: 'webkitTransitionEnd',
            OTransition:      'otransitionEnd',
            MozTransition:    'transitionend',
            MSTransition:     'msTransitionEnd',
            transition:       'transitionend'
        }),
        transform_origin: find_css_name({
            webkitTransformOrigin: '-webkit-transform-origin',
            MozTransformOrigin:    'transformOrigin',
            transformOrigin:       'transform-origin',
            OTransformOrigin:      '-o-transform-origin',
            msTransformOrigin:     '-ms-transform-origin'
        }),
        transform_style: find_css_name({
            webkitTransformStyle: "-webkit-transform-style",
            OTransformStyle:      "-o-transform-style",
            mozTransformStyle:    "-moz-transform-style",
            msTransformStyle:     "-ms-transform-style",
            transformStyle:       "transform-style"
        }),
        linear_gradient: function(){
            var prefix, i;
            var prefixes = ["-webkit-","-o-","-moz-","-ms-",""];
            var gradient_test = document.createElement("span");
            for(i = 0; i < prefixes.length; i++){
                prefix = prefixes[i];
                gradient_test.style.backgroundImage = prefix + "linear-gradient(left top, #9f9, white)";
                //alert("[" + prefix + "]:" + gradient_test.style.backgroundImage);
                if(gradient_test.style.backgroundImage.indexOf("gradient") !== -1){
                    return prefix + "linear-gradient(%)";
                }
            }
        }()
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

    var $scrollbar = document.createElement("div");
    document.body.appendChild($scrollbar);
    $scrollbar.className = "swiper-do-swipe-scrollbar";
    var scrollbar_buffer = 20; // 10 pixels from top and bottom = 20 total

    var is_form_widget = function(target){
        if(!target || !target.nodeName) return false;
        switch(target.nodeName.toLowerCase()){
            case "select":
            case "input":
            case "textarea":
                return true;
        }
        return false;
    }

}());