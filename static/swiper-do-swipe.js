(function($){
	"use strict";

    var defaults = {
            page_turn_at: 150, // horizontally, in pixels
            page_turn_animate_at: 20, // horizontally, in pixels
            begin_scroll_at: 10, // begin scrolling, in pixels
            page_scroll_at: 10 //vertically, in pixels
        };

    // Call swiper_do_swipe() with these parameters,
    // $pages is an array of elements (not jQuery object, not nodeList - see index.html for how to do this if you want help),
    // style is value in swiper_do_swipe_styles (below) e.g. swiper_do_swipe_styles.perspective
    // and options override the defaults (optional)
    window.swiper_do_swipe = function($pages, style, options){
        var property,
            _this;
            
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
                document.addEventListener('scroll',     prevent_default,  false);
                document.addEventListener('touchstart', this.touch.start, false);
                document.addEventListener('touchmove',  this.touch.move,  false);
                document.addEventListener('touchend',   this.pointer.end, false);
                document.addEventListener('mousedown',  this.mouse.start, false); // note these mouse events are removed if touch.start is called once
                document.addEventListener('mousemove',  this.mouse.move,  false);
                document.addEventListener('mouseup',    this.pointer.end, false);
                this.move_to_page(0);
            },
            init_$pages: function(){
                _this.$pages.map(function($page, i){
                    var id = $page.getAttribute("id");
                    if(id === undefined){
                        id = "page" + i;
                        $page.setAttribute("id", id);
                    }
                    _this.page_index_by_id[id] = i;
                    _this.page_id_by_index[i] = id;
                    $page.scroll_y = 0;
                    $page.style.width     = "100%";
                    $page.style.minHeight = "100%";
                    $page.style.minWidth  = "100%";
                    $page.style.display   = "block";
                    $page.style.position  = "absolute";
                    $page.style.overflow  = "hidden";
                    $page.style[css.transform_style] = "preserve-3d";
                    $page.addEventListener(css.transition_end, _this.style.page_move_end);
                });
            },
            pointer: { //a wrapper for touch/mouse interactions
                dragging: false,
                drag_direction: false,
                animation_id: undefined,
                current_style: undefined,
                start: function(event){
                    var pointer = _this.pointer;

                    pointer.dragging = true;
                    pointer.drag.distance.x = 0;
                    pointer.drag.distance.y = 0;
                    pointer.drag_direction = false;
                    if(pointer.animation_id){
                        window.cancelAnimationFrame(pointer.animation_id);
                    }
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                },
                move: function(event){
                    var pointer     = _this.pointer,
                        distance    = pointer.drag.distance;

                    if(pointer.drag_direction !== false) return;

                    if(Math.abs(distance.x) > _this.options.page_turn_animate_at){
                        pointer.drag_direction = "horizontal";
                        if(_this.style.before_horizontal) _this.style.before_horizontal(_this.$pages, _this.index);
                    } else if(Math.abs(distance.y) > _this.options.begin_scroll_at) {
                        pointer.drag_direction = "vertical";
                    }
                },
                animate: function(){ //called at 60fps, initially from pointer.start
                    var pointer     = _this.pointer,
                        distance    = pointer.drag.distance;

                    switch(pointer.drag_direction){
                        case "horizontal":
                            _this.style.horizontal(pointer, distance.x, $pages, _this.index);
                            break;
                        case "vertical":
                            _this.$pages[_this.index].style[css.transform] = "translateY(" + -distance.y + "px)";
                            break;
                    }
                    pointer.animation_id = window.requestAnimationFrame(pointer.animate);
                },
                end: function(event, distance){
                    var index       = _this.index,
                        pointer     = _this.pointer;

                    pointer.dragging = false;
                    window.cancelAnimationFrame(pointer.animation_id);
                    pointer.animation_id = undefined;
                    switch(pointer.drag_direction){
                        case "horizontal":
                            if(_this.style.after_horizontal){
                                _this.style.after_horizontal(_this.$pages, index);
                            }
                            if(Math.abs(pointer.drag.distance.x) < _this.options.page_turn_at) {
                                _this.move_to_page(index); // move to current page
                            } else {
                                index += (pointer.drag.distance.x < 0) ? -1 : 1;
                                _this.move_to_page(index);
                            }
                            break;
                        case "vertical":
                            $pages[index].scroll_y = pointer.drag.distance.y;
                            break;
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
                }
            },
            mouse: {
                dragging: false,
                start: function(event){
                    var position = _this.mouse.position(event),
                        pointer  = _this.pointer;
                    pointer.drag.start.x = position.x;
                    pointer.drag.start.y = position.y;
                    pointer.start(event);
                },
                move: function(event){
                    var pointer  = _this.pointer,
                        position;

                    if(!pointer.dragging) return;
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
                
                i = Math.max(Math.min(i, $pages.length - 1), 0); // make sure we're exceeding the range of $pages
                _this.style.move_to_page($pages, i);
                _this.index = i;
            },
            
            page_index_by_id: {},
            page_id_by_index: {},
        };

        _this.init();
        return _this;
    };

    window.swiper_do_swipe_styles = {};

    window.swiper_do_swipe_styles.perspective = {
        horizontal: function(pointer, value, $pages, index){
            var $page_current = $pages[index],
                $page_before  = $pages[index - 1],
                $page_after   = $pages[index + 1],
                negative = (value < 0) ? -1 : 1;

            if($page_current){
                var page_current_value = negative * (Math.abs((value / window_width) * 2) * 90);
                if(negative > 0) {
                    $page_current.style[css.transform_origin] = "left center";
                    $page_current.style[css.transform] = "perspective(" + window_width / 2 + "px) rotateY(" + page_current_value + "deg)";
                } else {
                    $page_current.style[css.transform_origin] = "right center";
                    $page_current.backgroundImage = "-webkit-linear-gradient(left right, blue, red)";
                    $page_current.style[css.transform] = "perspective(" + window_width / 2 + "px) rotateY(" + page_current_value + "deg)";
                }
                
            }
            if($page_before && negative < 0){
                var page_before_value = Math.abs(value / window_width);
                page_before_value = ((page_before_value * (2 - page_before_value)) * (window_width * 0.8));
                page_before_value = page_before_value;
                page_before_value -= window_width;
                $page_before.style[css.transform] = "translateX(" + page_before_value + "px) rotateY(0deg)";
            }
            if($page_after && negative > 0){ //because we only animate either the before OR after, not both
                var page_after_value = Math.abs(value / window_width);
                page_after_value = ((page_after_value * (2 - page_after_value)) * (window_width * 0.8));
                page_after_value = page_after_value * -negative;
                page_after_value += window_width;
                $page_after.style[css.transform] = "translateX(" + page_after_value + "px) rotateY(0deg)";
            }
        },
        before_horizontal: function($pages, index){ // insert quagmire.gif here
            var $page_current = $pages[index],
                $page_before =  $pages[index - 1],
                $page_after  =  $pages[index + 1],
                during_animation_set_height_to = window_height - 50; //because this shows the box edges more. 50 is arbitrary (change it if you want) but it's a safe amount of pixels (not too few to be annoying on mobile)

            $page_current.style.height    = during_animation_set_height_to + "px";
            $page_current.style.minHeight = during_animation_set_height_to + "px";
            $page_current.style.opacity = 1;
            $page_current.style.zIndex = 2;
            $page_current.style.display = "";
            $page_current.style[css.transform_origin] = "50% 50%";

            if($page_before) {
                $page_before.style.height    = during_animation_set_height_to + "px";
                $page_before.style.minHeight = during_animation_set_height_to + "px";
                $page_before.style.opacity = 1;
                $page_before.style.zIndex = 2;
                $page_before.style.display = "";
                $page_before.style[css.transform_origin] = "50% 50%";
            }
            if($page_after) {
                $page_after.style.height    = during_animation_set_height_to + "px";
                $page_after.style.minHeight = during_animation_set_height_to + "px";
                $page_after.style.opacity = 1;
                $page_after.style.zIndex = 2;
                $page_after.style.display = "";
                $page_after.style[css.transform_origin] = "50% 50%";
            }
        },
        after_horizontal: function($page, index){
            var $page_current = $pages[index],
                $page_before =  $pages[index - 1],
                $page_after  =  $pages[index + 1];

            $page_current.style.height = "auto";
            $page_current.style.minHeight = "100%";
            if($page_before) {
                $page_before.style.height     = "auto";
                $page_before.style.minHeight  = "100%";
            }
            if($page_after) {
                $page_after.style.height    = "auto";
                $page_after.style.minHeight = "100%";
            }
        },
        move_to_page: function($pages, i){
            var $page_current = $pages[i],
                $page_before  = $pages[i - 1],
                $page_after   = $pages[i + 1];

            if(this.has_been_setup) {
                //because every subsequent call uses CSS transitions
                document.body.classList.add("swiper-do-swipe-css-perspective-transition");
            } else {
                this.has_been_setup = true;
            }
            $page_current.style[css.transform] = "translate3d(0px, 0px, 0) rotateY(0deg)";
            $page_current.style.opacity = 1;
            $page_current.style.zIndex = 2;
            if($page_before){
                $page_before.style[css.transform] = "translate3d(-100%, 0px, 0) rotateY(-90deg) translate3d(-100%, 0, 0)";
                $page_before.style.opacity = 0;
                $page_before.style.zIndex = 1;
            }
            if($page_after){
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
            document.body.classList.remove("swiper-do-swipe-css-perspective-transition");
        }
    };
  
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

}());