# ha-bt-proximity

## Distributed Bluetooth Room Presence for Home Assistant

This is a complete DIY solution for room presence/proximity detection in [Home Assistant](https://www.home-assistant.io/). It uses a [Raspberry Zero W](https://www.raspberrypi.org/products/raspberry-pi-zero-w/) to track the proximity of phones, smartwatches, etc. via bluetooth. The relative proximity is determined by querying the [RSSI](https://www.bluetooth.com/blog/proximity-and-rssi/) (signal strength) of the tracked device using a combination of `rfcomm` and `hcitool` commands executed via a Node.js script. 

Once the signal strength is retrieved, a proximity value ranging from 0 (closest proximity) to -100 (undetectable) is calculated and pushed to a MQTT Broker ([Mosquitto](https://mosquitto.org/)) running in Home Assistant. From there, you can setup sensors to determine the presence in a room (or relative distance) of a particular user. These sensors can be useful for triggering Automations based on presence (like turning lights on when someone walks into a room, turning an AC off when a room is empty, and more).

![Sensor Card](https://i.imgur.com/h8bMZc3.png)

### Requirements

1. Raspberry Pi Zero W (~$30 USD)
2. Micro SD Card (2GB size minimum)
3. A Home Assistant installation up and running.

### Home Assistant Configuration

1. Install Mosquitto MQTT Broker in Home Assistant. [Instructions here](https://www.home-assistant.io/addons/mosquitto/).
2. Add a new MQTT sensor in your Home Assistant `configuration.yaml` file. Make sure to replace the value in `state_topic` to match the name of the room you will place the Raspberry Pi Zero at (`bedroom`, `living room`, `kitchen`, etc.) and replace `00:00:00:00:00:00` for the actual Bluetooth MAC address of the device you want to track:

    ```yaml
    sensor:
        - platform: mqtt
          state_topic: 'location/bedroom/00:00:00:00:00:00'
          value_template: '{{ value_json.proximity }}'
          unit_of_measurement: 'level'
          name: 'Xavier Bedroom Proximity'
    ```
    **NOTE:** You can add multiple mqtt sensors if you want to track more devices.
3. Save `configuration.yaml` and restart Home Assistant.

### Raspberry Pi Zero W OS Setup

1. Download latest version of [Raspbian Jessie Lite Stretch](https://downloads.raspberrypi.org/raspbian_lite_latest)
2. Download [balenaEtcher](https://etcher.io).
3. Copy the image to the SD card using balenaEtcher. [Instructions here](https://www.raspberrypi.org/magpi/pi-sd-etcher/).
4. Remove the SD Card and re-insert it. There will be 2 partitions on the SD card, including one named `boot`.
5. To enable SSH, in the `boot` partition create blank file (without any extension) in the root directory called `ssh`
6. To setup the Wifi network, in the `boot` partition, create file named a `wpa_supplicant.conf` in the root directory and enter your wi-fi network details:

    ```
    country=US
    ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
    update_config=1

    network={
        ssid="Your Network Name"
        psk="Your Network Password"
        key_mgmt=WPA-PSK
    }
    ```

7. Insert the SD card and power on your Raspberry Pi Zero W. You will probably need to find the IP address of the Raspberry Pi via your router.

### Raspberry Pi Zero W Configuration

1. SSH into the Raspberry Pi (username: pi password: raspberry)
2. Change the default password:

    ```sh
    sudo passwd pi
    ```
3. Upgrade packages and Raspbian to the latest version:

    ```sh
    sudo apt-get update
    sudo apt-get upgrade -y
    sudo apt-get dist-upgrade -y
    sudo reboot
    ```
4. Setup Bluetooth:

    Install the latest bluetooth drivers and firmware:
    ```
    # Install BT drivers
    sudo apt-get install pi-bluetooth -y

    # Check that BT is working
    sudo service bluetooth start
    sudo service bluetooth status
    ```
    
    Add SP profile to the bluetooth daemon.
    ```
    sudo nano /etc/systemd/system/dbus-org.bluez.service 
    ```
    
    Add ' -C' at the end of the 'ExecStart=' line, to start the bluetooth daemon in 'compatibility' mode. Add a new 'ExecStartPost='   immediately after that line, to add the SP Profile. The two lines should look like this:
    ```
    ExecStart=/usr/lib/bluetooth/bluetoothd -C
    ExecStartPost=/usr/bin/sdptool add SP
    ```
    
    Save and reboot
    ```
    sudo reboot
    ``` 
    
 5. Install Mosquitto MQTT Broker client: 
 
    ```
    # Get repository key
    wget http://repo.mosquitto.org/debian/mosquitto-repo.gpg.key

    # Add repository
    sudo apt-key add mosquitto-repo.gpg.key

    # Download lists file 
    cd /etc/apt/sources.list.d/
    sudo wget http://repo.mosquitto.org/debian/mosquitto-stretch.list

    # Update cache and install 
    apt-cache search mosquitto
    sudo apt-get update
    sudo apt-get install libmosquitto-dev mosquitto mosquitto-clients -y
    ```
 6. Install Node.js:
 
    ```
    sudo apt-get install nodejs npm -y
    ```
7. Install the ha-bt-proximity script:

    ```
    # Install git
    cd ~
    sudo apt-get install git -y

    # Clone ha-bt-proximity repository
    git clone git://github.com/jxlarrea/ha-bt-proximity

    # Enter ha-bt-proximity directory
    cd ha-bt-proximity

    # Install dependencies
    npm install
    ```
10. Configure the ha-bt-proximity script:

    ```
    nano index.js
    ```
    Then edit the first few lines with your own values for the MQTT Broker connection and Bluetooth MAC addressed that you want tracked:
    
    ```javascript
    // MQTT Broker details

    var mqtt_host = "192.168.1.x"; // Your MTTQ broker IP address
    var mqtt_port = 1883; // Your MTTQ broker port
    var mqtt_user = "mqtt_user"; // Your MQTT broker username
    var mqtt_password = "mqtt_pwd"; // Your MQTT broker password
    var mqtt_room = "bedroom"; // Location where the Raspberry Pi device will be located


    // Tracked BT mac addresses

    var owners = [
    "00:00:00:00:00:00", // Pixel 2 Bluetooth Mac Address;
    "11:11:11:11:11:11" // You can track multiple devices, just keep adding them to the array;
    ];
    ```
    **NOTE:** The mac addresses *MUST* match those entered previously in the Home Assistant sensor definition.
11. Setup the script to run as a service

    ```
    sudo nano /etc/systemd/system/ha-bt-proximity.service
    ```
    Add the following service definition:
    
    ```
    [Unit]
    Description=HA BT Proximity Service

    [Service]
    User=root
    ExecStart=/usr/bin/node /home/pi/ha-bt-proximity/index.js
    WorkingDirectory=/home/pi/ha-bt-proximity
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target
    ```
    Finally, enable and start the newly created service:
    
    ```
    sudo systemctl enable ha-bt-proximity.service
    sudo systemctl start ha-bt-proximity.service
    ```
    
    **NOTE:** If you need to modify the `index.js` script in the future, make sure to restart the service using:
    ```
    sudo systemctl restart ha-bt-proximity.service
    ```
    
### You are done!

If all went well, you will now see in Home Assistant the previously added sensor showing the relative proximity of your tracked devices. The sensor proximity value ranges from 0 (closest proximity possible) to -100 (undetectable).

You can use this proximity value to setup Automations based on room presence in your home or even place multiple Raspberry Pi Zero W's around your place to triangulate your position.

For example, you can create a room presence binary sensor in Home Assistant like this:

```yaml
binary_sensor:
  - platform: template
    sensors:
      xavier_bedroom_presence:
        friendly_name: "Xavier Bedroom Presence"
        delay_off:
          seconds: 30 
        value_template: >-
          {% if not (states('sensor.xavier_bedroom_proximity') == 'unknown') and (states('sensor.xavier_bedroom_proximity')|int > -10) %}
            true
          {% else %}
            false
          {% endif %}
```
You will have to figure out the optimal proximity value (-10 above) to consider the device as "present" in the room. This will vary greatly based on the strength of your device's BT signal, room size, line of sight, etc.

Once you setup binary sensors like the above for multiple rooms in your house, you can create a separate sensor to show the location of the tracked device:

```yaml
sensor:
  - platform: template
    sensors:
      xavier_home_location:
        friendly_name: "Xavier Home Location"
        value_template: >-
          {% if is_state('binary_sensor.xavier_bedroom_presence', 'on') %}
            Bedroom
          {% elif is_state('binary_sensor.xavier_office_presence', 'on') %}
            Office
          {% elif is_state('binary_sensor.xavier_living_room_presence', 'on') %}
            Living Room        
          {% else %}
            Unknown
          {% endif %}
```

### Acknowledgements 

Before working on this, I tried to find an already existing room presence detection solution for Home Assistant. I came across 2 in particular that became the inspiration to create this:

1. **[@andrewjfreyer](https://github.com/andrewjfreyer)'s presence**: This seemed like the solutions I was looking for. Unfortunately, his approach only works as a binary sensor: If multiple Raspberry Pi Zero W in different rooms around your house detect your tracked device bluetooth signal, they will all mark as if you are present in their respective rooms at the same time. You can check out his repository [here](https://github.com/andrewjfreyer/presence).

2. **@[seangreen2](https://github.com/seangreen2)'s Google Home approach**: This was the first solution I looked into. It uses Google Home to basically do the same thing I'm doing. Unfortunately, it relied on an unofficial Google Home API that stopped working a long time ago. He updated his solution and now adds Samsung Smartthings to the equation. You can read more about it in his [Reddit post](https://www.reddit.com/r/homeassistant/comments/a9sj4y/i_successfully_got_room_presence_working_using/).

Hope some of you find this useful!
