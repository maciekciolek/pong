import sys
import requests
from sseclient import SSEClient
import threading
from pprint import pprint
import json
from time import sleep

import serial

ser = serial.Serial('/dev/ttyS0', 38400)
ser.write(chr(0))
ser.write(chr(128 + 16 + 4))
ser.write(chr(64))
ser.write(chr(32))

address = ''
pin = ''
player = ''
score = 0

def read_move(old_position):
    response = ser.read(1)
    if len(response) > 0:
        ch=ord(response)
        if (ch >= 64 and ch <= 127):
            return (int) ((ch - 64) * 1.5)

    return old_position

def read_pin():
    global ser
    pin = ''
    last_knob_position = None
    print "Readin pin"
    while len(pin) < 4:
        response = ser.read(1)
        if len(response)>0:
            ch = ord(response)            
            #print ch

            # knob moved
            if (ch >= 64 and ch <= 127):
                last_knob_position = ch - 64

            # button pressed
            if (ch == 128 + 64 + 2 + 1) and last_knob_position != None:
                pin += str((int) (last_knob_position / 16) + 1)
                print "Ch: " + str(last_knob_position)
                print "Pin: " + pin

    print "Pin: " + pin
    return pin

def set_new_score(score):
    print 'You scored: ' + str(score)

    # Do we want to keep this?
    ser.write(chr(32 + 1))
    sleep(3)
    ser.write(chr(32 + 0))

def set_winner(winner):
    global ser
    if winner == pin:
        print 'You won!'
        ser.write(chr(64 + 12))
    else:
        print 'You lost!'
        ser.write(chr(64 + 48))

def play():
    global ser

    position = 50;
    old_position = 50;

    while True:
        position = read_move(old_position)

        if (position != old_position):
            old_position = position

            r = requests.post(address + '/move' + '/' + pin + '/' + str(position))
            print position
            print r

def join_game():
    global pin
    global player
    pin = read_pin()

    print pin

    response = requests.post(address + '/join/' + pin).json()

    if response['player_1']['pin'] == pin:
        player = 'player_1'
    else:
        player = 'player_2'

    return response['id']

def process_events():
    messages = SSEClient(address + '/events/' + str(game_id))
    for msg in messages:
        pprint(msg.data)

        if msg.data != '':
            msg = json.loads(msg.data)
            if int(msg[player]['score']) != score:
                set_new_score(msg[player]['score'])

            if msg['finish']:
                set_winner(msg['winner'])


address = sys.argv[1]

print address
game_id = join_game()

threading.Thread(target=process_events).start()

play()