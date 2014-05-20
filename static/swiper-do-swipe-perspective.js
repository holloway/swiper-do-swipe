(function($){
	"use strict";

    window.swiper_do_swipe_effects.perspective = {
        horizontal: function(pointer, value, $pages, index){
            var $page_current = $pages[index],
                $page_before  = $pages[index - 1],
                $page_after   = $pages[index + 1],
                negative = (value < 0) ? -1 : 1;

            var page_current_value = negative * (Math.abs((value / window_width) * 2) * 90);
            if(negative > 0) {
                if(!this.direction || this.direction === "left"){
                    $page_current.style[css.transform_origin] = "0% 50%";
                    $page_current.style.backgroundImage = css.linear_gradient.replace(/%/, 'left, #fff 70%,#ccc 100%');
                }
                $page_current.style[css.transform] = "perspective(" + window_width / 2 + "px) rotateY(" + page_current_value + "deg) ";
                this.direction = "right";
            } else {
                if(!this.direction || this.direction === "right"){
                    $page_current.style[css.transform_origin] = "100% 50%";
                    $page_current.style.backgroundImage = css.linear_gradient.replace(/%/, 'right, #fff 70%,#ccc 100%');
                }
                $page_current.style[css.transform] = "perspective(" + window_width / 2 + "px) rotateY(" + page_current_value + "deg)";
                this.direction = "left";
            }
            if($page_before && negative < 0){
                var page_before_value = Math.abs(value / window_width);
                page_before_value = ((page_before_value * (2 - page_before_value)) * (window_width * 0.8));
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
                $page_after  =  $pages[index + 1];

            window.reduce_size_before_horizontal_scroll($pages, index, 25);
            this.direction = undefined;
            $page_current.style.opacity = 1;
            $page_current.style.zIndex = 2;
            $page_current.style.display = "";
            $page_current.style[css.transform_origin] = "50% 50%";
            if($page_before) {
                $page_before.style.opacity = 1;
                $page_before.style.zIndex = 2;
                $page_before.style.display = "";
                $page_before.style[css.transform_origin] = "50% 50%";
            }
            if($page_after) {
                $page_after.style.opacity = 1;
                $page_after.style.zIndex = 2;
                $page_after.style.display = "";
                $page_after.style[css.transform_origin] = "50% 50%";
            }
        },
        after_horizontal: function($pages, index){
            var $page_current = $pages[index],
                $page_before =  $pages[index - 1],
                $page_after  =  $pages[index + 1];

            $page_current.style.backgroundImage = "";
            if($page_before) {
                $page_before.style.backgroundImage = "";
            }
            if($page_after) {
                $page_after.style.backgroundImage = "";
            }
        },
        move_to_page: function($pages, i){
            var $page_current = $pages[i],
                $page_before  = $pages[i - 1],
                $page_after   = $pages[i + 1];

            if(this.has_been_setup) {
                //because every subsequent call uses CSS transitions
                document.body.classList.add("swiper-do-swipe-css-transition");
            } else {
                this.has_been_setup = true;
            }
            $page_current.style[css.transform] = "translate3d(0px, 0px, 0) rotateY(0deg) translateY(" + -$page_current.scroll_y + "px)";
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
            document.body.classList.remove("swiper-do-swipe-css-transition");
        }
    };
    
}());