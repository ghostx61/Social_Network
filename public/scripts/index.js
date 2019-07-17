$(document).ready(function(){
    $('.cc').click(function(event){
        event.preventDefault();
        console.log($( this ).children( 'i' ).hasClass('fa-comment-alt'));
    });

    $('.likeBtn').click(function(event){
        event.preventDefault();
       var likeB = $(this);
       
        $.ajax({
            url: $(this).attr("href"),
            contentType: "application/json",
        }).done(function(response){
            console.log(response.postID);
            var like = "/post/"+response.postID+"/like";
            var unlike = "/post/"+response.postID+"/unlike";
            console.log(like);
            var status=$(likeB).children( 'i' ).hasClass('far');  //unlike
            var icon = $(likeB).children( 'i' );
            var l_count=parseInt($(likeB).parent().children('p.count').children('span').text());
            if(status){
               $(icon).removeClass("far");
                $(icon).addClass("fas");
                $(likeB).attr("href", unlike);
                l_count++;
                $(likeB).parent().children('p.count').children('span').text(l_count);
                console.log("likebtn");
            }
            else{
                $(icon).removeClass("fas");
                $(icon).addClass("far");
                $(likeB).attr("href", like);
                l_count--;
                $(likeB).parent().children('p.count').children('span').text(l_count);
                console.log("unlikebtn");
            }
        });
    });
    
});




