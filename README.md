# ha-bt-proximity

## Distributed Bluetooth Room Presence Sensor for Home Assistant

This is a complete DIY solution for room presence/proximity detection in [Home Assistant](https://www.home-assistant.io/). It uses [Raspberry Zero W](https://www.raspberrypi.org/products/raspberry-pi-zero-w/) devices to track the proximity of phones, smartwatches, etc. via bluetooth. The relative proximity is determined by querying the [RSSI](https://www.bluetooth.com/blog/proximity-and-rssi/) (signal strength) of the tracked device. 

Once the signal strength is retrieved, a proximity value ranging from 0 (closest proximity) to -100 (furthest proximity / undetected) is calculated and pushed to a MQTT Broker ([Mosquitto](https://mosquitto.org/)) running in Home Assistant. From there, you can setup sensors to determine the presence in a room (or relative distance) of a particular user. These sensors can be useful for triggering Automations based on presence (like turning lights on when someone walks into a room, turning an AC off when a room is empty, and more).

### Requirements

1. Raspberry Pi Zero W (~$30 USD)
2. Micro SD Card (2GB size minimum)
3. A Home Assistant installation up and running.

### OS Setup

1. Download latest version of [Raspbian Jessie Lite Stretch](https://downloads.raspberrypi.org/raspbian_lite_latest)
2. Download [balenaEtcher](https://etcher.io).
3. Copy the image to SD card using balenaEtcher. [Instructions here](https://www.raspberrypi.org/magpi/pi-sd-etcher/).
4. Remove SD Card and re-insert it. There will be 2 partitions on the SD card, including one named `boot`.
5. **[Enable SSH]** In the `boot` partition, create blank file (without any extension) in the root directory called `ssh`
6. **[Setup WiFi]** In the `boot` partition, create file named a `wpa_supplicant.conf` in the root directory and add your wi-fi network details:

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


