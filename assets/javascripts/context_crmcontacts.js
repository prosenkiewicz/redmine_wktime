/* Redmine - project management software
   Copyright (C) 2006-2017  Jean-Philippe Lang */

let contextMenuObserving;

function contextMenuRightClick(event) {
  let target = $(event.target);
  if (target.is('a')) {return;}
  let tr = target.closest('.hascontextmenu').first();
  if (tr.length < 1) {return;}
  event.preventDefault();
  if (!contextMenuIsSelected(tr)) {
    contextMenuUnselectAll();
    contextMenuAddSelection(tr);
    contextMenuSetLastSelected(tr);
  }
  contextMenuShow(event);
}

function contextMenuClick(event) {
  let target = $(event.target);
  let lastSelected;

  if (target.is('a') && target.hasClass('submenu')) {
    event.preventDefault();
    return;
  }

  if (target.is('li') && target.hasClass('queue-phone')) {
    openQueueSelectionModal(target);
  }

  if (!target.parents().hasClass('queues-modal') || target.hasClass('queues-modal-button-cancel')) {
    removeQueueSelectionModal();
  }

 if (target.is('input[type="checkbox"]') && target.hasClass('queue-checkbox')) {
   $('input[class="queue-checkbox"]').on('change', function() {
   $('input[class="queue-checkbox"]').not(this).prop('checked', false);
  });
 }

  if (target.is('button') && target.hasClass('queues-modal-button-send')) {
    event.preventDefault();
    let data = target.parents('form:first').serialize();
    let url = target.parents('form:first').attr('url');
    sendSelectedQueueData(data, url);
    removeQueueSelectionModal();
  }

  contextMenuHide();
  if (target.is('a') || target.is('img')) { return; }
  if (event.which == 1 || (navigator.appVersion.match(/\bMSIE\b/))) {
    let tr = target.closest('.hascontextmenu').first();
    if (tr.length > 0) {
      // a row was clicked, check if the click was on checkbox
      if (target.is('input')) {
        // a checkbox may be clicked
        if (target.prop('checked')) {
          tr.addClass('context-menu-selection');
        } else {
          tr.removeClass('context-menu-selection');
        }
      } else {
        if (event.ctrlKey || event.metaKey) {
          contextMenuToggleSelection(tr);
        } else if (event.shiftKey) {
          lastSelected = contextMenuLastSelected();
          if (lastSelected.length) {
            let toggling = false;
            $('.hascontextmenu').each(function(){
              if (toggling || $(this).is(tr)) {
                contextMenuAddSelection($(this));
              }
              if ($(this).is(tr) || $(this).is(lastSelected)) {
                toggling = !toggling;
              }
            });
          } else {
            contextMenuAddSelection(tr);
          }
        } else {
          contextMenuUnselectAll();
          contextMenuAddSelection(tr);
        }
        contextMenuSetLastSelected(tr);
      }
    } else {
      // click is outside the rows
      if (target.is('a') && (target.hasClass('disabled') || target.hasClass('submenu'))) {
        event.preventDefault();
      } else if (target.is('.toggle-selection') || target.is('.ui-dialog *') || $('#ajax-modal').is(':visible')) {
        // nop
      } else {
        contextMenuUnselectAll();
      }
    }
  }
}

function contextMenuCreate() {
  if ($('#context-menu').length < 1) {
    let menu = document.createElement("div");
    menu.setAttribute("id", "context-menu");
    menu.setAttribute("style", "display:none;");
    document.getElementById("content").appendChild(menu);
  }
}

function contextMenuShow(event) {
  let mouse_x = event.pageX;
  let mouse_y = event.pageY;  
  let mouse_y_c = event.clientY;  
  let render_x = mouse_x;
  let render_y = mouse_y;
  let dims;
  let menu_width;
  let menu_height;
  let window_width;
  let window_height;
  let max_width;
  let max_height;
  let url;

  $('#context-menu').css('left', (render_x + 'px'));
  $('#context-menu').css('top', (render_y + 'px'));
  $('#context-menu').html('');

  url = $(event.target).parents('form').first().data('cm-url');
  if (url == null) {alert('no url'); return;}

  $.ajax({
    url: url,
    data: $(event.target).parents('form').first().serialize(),
    success: function(data, textStatus, jqXHR) {
      $('#context-menu').html(data);
      menu_width = $('#context-menu').width();
      menu_height = $('#context-menu').height();
      max_width = mouse_x + 2*menu_width;
      max_height = mouse_y_c + menu_height;

      let ws = window_size();
      window_width = ws.width;
      window_height = ws.height;

      /* display the menu above and/or to the left of the click if needed */
      if (max_width > window_width) {
       render_x -= menu_width;
       $('#context-menu').addClass('reverse-x');
      } else {
       $('#context-menu').removeClass('reverse-x');
      }

      if (max_height > window_height) {
       render_y -= menu_height;
       $('#context-menu').addClass('reverse-y');
        // adding class for submenu
        if (mouse_y_c < 325) {
          $('#context-menu .folder').addClass('down');
        }
      } else {
        // adding class for submenu
        if (window_height - mouse_y_c < 345) {
          $('#context-menu .folder').addClass('up');
        } 
        $('#context-menu').removeClass('reverse-y');
      }

      if (render_x <= 0) render_x = 1;
      if (render_y <= 0) render_y = 1;
      $('#context-menu').css('left', (render_x + 'px'));
      $('#context-menu').css('top', (render_y + 'px'));
      $('#context-menu').show();

      //if (window.parseStylesheets) { window.parseStylesheets(); } // IE
    }
  });
}

function contextMenuSetLastSelected(tr) {
  $('.cm-last').removeClass('cm-last');
  tr.addClass('cm-last');
}

function contextMenuLastSelected() {
  return $('.cm-last').first();
}

function contextMenuUnselectAll() {
  $('input[type=checkbox].toggle-selection').prop('checked', false);
  $('.hascontextmenu').each(function(){
    contextMenuRemoveSelection($(this));
  });
  $('.cm-last').removeClass('cm-last');
}

function contextMenuHide() {
  $('#context-menu').hide();
}

function contextMenuToggleSelection(tr) {
  if (contextMenuIsSelected(tr)) {
    contextMenuRemoveSelection(tr);
  } else {
    contextMenuAddSelection(tr);
  }
}

function contextMenuAddSelection(tr) {
  tr.addClass('context-menu-selection');
  contextMenuCheckSelectionBox(tr, true);
  contextMenuClearDocumentSelection();
}

function contextMenuRemoveSelection(tr) {
  tr.removeClass('context-menu-selection');
  contextMenuCheckSelectionBox(tr, false);
}

function contextMenuIsSelected(tr) {
  return tr.hasClass('context-menu-selection');
}

function contextMenuCheckSelectionBox(tr, checked) {
  tr.find('input[type=checkbox]').prop('checked', checked);
}

function contextMenuClearDocumentSelection() {
  // TODO
  if (document.selection) {
    document.selection.empty(); // IE
  } else {
    window.getSelection().removeAllRanges();
  }
}

function openQueueSelectionModal(event) {
  let url = event.attr("url");
  let value = JSON.parse(event.attr("value"));
  let selectedKey = event.attr("key");
  let data = [];
  if (value.length > 1) {
    $.each(value, function(key, value){
      if (value.numbers[selectedKey] == null) {
        data.push({name: "name[]", value: value.name});
      } else if (value.numbers[selectedKey].length > 0) {
        data.push({name: "numbers[]", value: value.numbers[selectedKey]});
      } else {
        data.push({name: "name[]", value: value.name});      
      }
    });
  } else {
    $.each(value, function(key, value){
    data.push({name: "numbers[]", value: value[selectedKey]});
  });
  }
  console.log(data);
  
  $.ajax({
    type: "POST",
    url: url,
    data: $.param(data),
    success: function(data, textStatus, jqXHR) {
      modalCreate(data);
    }
  });
}

function removeQueueSelectionModal() {
  $("#queues-modal").remove();
}

function modalCreate(data) {
    let menu = document.createElement("div");
    menu.setAttribute("id", "queues-modal");
    menu.setAttribute("class", "queues-modal ui-widget modal");
    menu.innerHTML = data;
    document.getElementById("content").appendChild(menu);
}

function sendSelectedQueueData(data, url) {
  console.log(data);
  console.log(url);
  $.ajax({
    type: "POST",
    url: url,
    data: data,
    success: function(data, textStatus, jqXHR) {
      modalCreate(data);
    }
  });
}


function contextMenuInit() {
  console.log("inited");
  contextMenuCreate();
  contextMenuUnselectAll();
  if (!contextMenuObserving) {
    $(document).click(contextMenuClick);
    $(document).contextmenu(contextMenuRightClick);
    contextMenuObserving = true;
  }
}

function toggleIssuesSelection(el) {
  let checked = $(this).prop('checked');
  let boxes = $(this).parents('table').find('input[name=data\\[\\]]');
  boxes.prop('checked', checked).parents('.hascontextmenu').toggleClass('context-menu-selection', checked);
}

function window_size() {
  let w;
  let h;
  if (window.innerWidth) {
    w = window.innerWidth;
    h = window.innerHeight;
  } else if (document.documentElement) {
    w = document.documentElement.clientWidth;
    h = document.documentElement.clientHeight;
  } else {
    w = document.body.clientWidth;
    h = document.body.clientHeight;
  }
  return {width: w, height: h};
}

$(document).ready(function(){
  console.log("doc rdy");
  contextMenuInit();
  $('input[type=checkbox].toggle-selection').on('change', toggleIssuesSelection);
});
