
var log_count = 0;
function log(t) {
  try {
    sd = document.getElementById('statusdiv');
    sd.innerText += '(' + log_count + '): ' + t + "\n";
    sd.scrollTop = sd.scrollHeight;
    log_count += 1;
  } catch (e) { };
  console.log(t);
}

// sets the initial stored url for configuration fetching
// if it is not already set. It also stores it to the local store.
function set_initial_url(cb) {
  var source = null;
  chrome.storage.local.get(['config_source'],function(items) {
    if ('config_source' in items) {
      source = items.config_source;
      cb(source);
    } else {
      source = defaults.config_source;
      chrome.storage.local.set({'config_source': source},function() {
        cb(source);
      });
    }
  });
};


function loadConfigRemote(cb) {
  log('loadConfigRemote START');
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    log('readystatechange');
    if (xhr.readyState == 4) {
      text = xhr.responseText;
      if (xhr.status == 200) {
	    log("FETCH SUCCESS");
        storeConfig(null,text,cb)
      } else {
        log('ERROR: ' + xhr.status);
        cb('err',"status was " + xhr.status);
      }
    }
  };
  chrome.storage.local.get(['config_source'],function(items) {
    if ('config_source' in items) {
      var source = items.config_source;
      source += '?_=' + (new Date).getTime();
      log('loadConfigRemote fetching: ' + source);
      xhr.open('GET',source, true);
      xhr.send();
    }
  });
  log('loadConfigRemote DONE');
}


function loadConfig(cb,try_remote = true) {
  log('loadConfig START');
  chrome.storage.local.get(
    ['cfgdata', 'config_date', 'config_valid'],
	function(items) {
      log('loadConfig readLocal');
      var now = (new Date).getTime();
      var have_config = ('config_valid' in items) && items.config_valid;
      var max_age = defaults.max_age;
      if (have_config) {
        if ('refresh_age' in items) {
          max_age = items.cfgdata.refresh_age;
        }
      };
      if (have_config &&
	      (now - items.config_date < max_age)) {
        log('loading from storage');
        cb(null,items.cfgdata);
	  } else if (try_remote) {
        log('calling loadConfigRemote');
        loadConfigRemote(cb);
	  } else {
        log('loadConfig FAILED');
        cb('load_config_failed');
	  }
	});		
    log('loadConfig DONE');
}


function storeConfig(err,txt,cb) {
  log("storeConfig START");
  if (err != null) {
    cb(err,txt);
    return;
  } 

  var data = {};

  try {
    data = JSON.parse(txt);
  } catch(e) {
    log("JSON parse error");
    log(e);
    cb(e,txt);
    return;
  }
 

  if (data.schema == 'InsultMarkupLanguage/0.1') {
    chrome.storage.local.set({'cfgdata': data}, function() {
      if (chrome.lastError) {
        cb(chrome.lastError);
      }	else {
        date = (new Date).getTime();
        chrome.storage.local.set({'config_date': date}, function() {});
        chrome.storage.local.set({'config_valid': true}, function() {});
        chrome.storage.local.set({'last_chosen_time': 0}, function() {});
	log("STORE SUCCESS");
	loadConfig(cb,false);
      }
    });
  }
}