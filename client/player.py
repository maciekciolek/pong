import getch
import sys
import requests
from sseclient import SSEClient
import threading
from pprint import pprint
import json

address = 'www.onet.pl'
pin = ''
player = ''
score = 0

def read_move():
    move = 0
    keypress = ord(getch.getch())

    print keypress
    if keypress == 97:
        move = -1
    elif keypress == 100:
        move = 1

    return move

def read_pin():
    return raw_input('Gimme pin: ')

def set_new_score(score):
    print 'You scored: ' + str(score)

def set_winner(winner):
    if winner == pin:
        print 'You won!'
    else:
        print 'You lost!'

def play():
    position = 50;

    while True:
        move = read_move()

        if move == -1:
            position = max(0, position - 1)
        elif move == 1:
            position = min(100, position + 1)

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