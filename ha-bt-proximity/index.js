// MQTT Broker details

var mqtt_host = "192.168.1.x"; // Your MQTT broker / Home Assistant IP Address
var mqtt_port = 1883;
var mqtt_user = "mqtt_username";
var mqtt_password = "mqtt_password";
var mqtt_room = "bedroom" // Location where the Raspberry Pi Zero device will be located


// Tracked BT mac addresses

var owners = [
"00:00:00:00:00:00" // Bluetooth MAC Address of the phone/device to track. You can add more devices to the array to track more than one person.
];


// DO NOT EDIT BEYOND THIS POINT

var CronJob = require('cron').CronJob;

var lastseen = [];

var exec = require('child_process').exec;
function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(stdout, stderr); });
};

var cmd_rfcomm = "rfcomm connect 0 ";
var cmd_hcitool = "hcitool rssi ";
var rgx = /dev_found: (.*) type (.*) rssi (.*) flags/g
var mqtt_topic = "location";


function getTime() {

	return "[" + (new Date()).toJSON().slice(0, 19) + "] ";
}


function getRssiAndPublish(owner) {

	var cmd_rfcomm = `rfcomm connect 0 ${owner} 10`;
	execute(cmd_rfcomm, function(result, error){

		var cmd_hcitool = `hcitool rssi ${owner}`;

        	execute(cmd_hcitool, function(result_rssi,error_rssi) {
			var match =  result_rssi.match(/RSSI return value: (.*)/);

			var rssi = -200;

			if (match && match.length > 0) {
				rssi = parseInt(match[1]);
			} else {
			}


	                var last = lastseen.find(function(item) {
     	                   return item.owner === owner;
        	        });


               		if (!last) {

                        	last = {"owner":owner,"proximity":-300};
                        	lastseen.push(last);
                	}

                        var proximity = rssi;

                        if (proximity > 0) {
                                proximity = 0;
                        }


                        if (proximity < -100) {
                                proximity = -100;
                        }


                	if (last.proximity!=proximity) {

                        	var mqtt_topic_path = mqtt_topic + "/" + mqtt_room + "/" + owner;
				var mqtt_command = `mosquitto_pub -h "${mqtt_host}" -p "${mqtt_port}" -u "${mqtt_user}" -P "${mqtt_password}" -t "${mqtt_topic_path}" -m "{\\\"proximity\\\":${proximity},\\\"name\\\":\\\"${owner}\\\"}"`;
				last.proximity = proximity;
        			execute(mqtt_command, function(result_mqtt, error_mqtt){
				});
                	}

	        });

	});

}


var job = new CronJob({
	cronTime: '0/5 * * * * *',
	onTick: function() {
		owners.forEach(function(owner) {
			getRssiAndPublish(owner);
		});
	},
	start: false
});

job.start();
