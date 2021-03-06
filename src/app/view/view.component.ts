import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {SocketService} from '../socket.service';
import {Alert, AlertCenterService, AlertType} from 'ng2-alert-center';
import {UserService} from '../user.service';
import {CapitalizePipe} from '../pipes/capitalize.pipe';

@Component({
    selector: 'app-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.scss']
})
export class ViewComponent implements OnInit {
    @Output() disconnected = new EventEmitter<boolean>();
    connect;
    sessionConnection;
    dataConnection;
    buttonConnection;
    alertConnection;
    initConnection;
    messages = [];
    message;
    dealer;
    player;
    players = [];
    waitlist = [];
    buttons = {
        'ready': false,
        'hit': false,
        'stay': false,
        'double': true,
        'split': false,
        'buyIn': false
    };
    alert: Object;
    username: String;
    bet = 5;
    session;
    activePlay = false;
    time = 0;
    timer;
    config = {
        'readyTime': 30,
        'actionTime': 20
    };
    spectator = false;


    constructor(private socketService: SocketService, private alertService: AlertCenterService, private userService: UserService) {}

    ngOnInit() {
        this.sessionConnection = this.userService.getSession().subscribe((data: any) => {
            this.session = data;
            this.socketService.connect();

            this.connect = this.socketService.onConnect().subscribe((data: any) => {

                this.dataConnection = this.socketService.getDataUpdate().subscribe((data: any) => {
                    this.dealer = null;
                    this.players = [];
                    this.waitlist = data.waitlist;
                    this.activePlay = data.activePlay;
                    // see if user is in the player array else
                    if (this.isPlaying(data)) {
                        // player is seated
                        this.spectator = false;
                        for (let i = 0; i < data.players.length; i++) {
                            let player = data.players[i];
                            if (player.id == this.session.user.id) {

                                // put this player in the main slot
                                this.player = player;
                            } else {
                                // fill up the other player slots
                                this.players.push(player);
                            }
                        }

                        // player has a seat at the table

                        if (this.buttons.ready && !this.timer) {
                            if (!this.timer) {
                                this.time = this.config.readyTime;
                                this.timer = setInterval(() => {
                                    if (!this.time) {
                                        this.clearTimer();
                                        this.disconnected.emit(true);
                                        this.socketService.disconnect();
                                    } else {
                                        this.time--;
                                    }
                                },1000);
                            }
                        }
                        if (this.player.turn) {
                            this.buttons.hit = true;
                            this.buttons.stay = true;
                            if (!this.timer) {
                                this.time = this.config.actionTime;
                                this.timer = setInterval(() => {
                                    if (!this.time) {
                                        this.clearTimer();
                                        this.onClickStay();
                                    } else {
                                        this.time--;
                                    }
                                },1000);
                            }
                        } else {
                            this.buttons.hit = false;
                            this.buttons.stay = false;
                            // this.buttons.split = false;
                        }
                    } else {
                        // player is in waitlist
                        this.spectator = true;
                        for (let i = 0; i < data.players.length; i++) {
                            let player = data.players[i];
                            if (data.players[0]) {
                                // put the first in array into the main slot
                                this.player = player;
                            } else {
                                // fill up the other player slots
                                this.players.push(player);
                            }
                        }
                    }
                    this.dealer = data.dealer;
                });

                this.buttonConnection = this.socketService.getButtonUpdate().subscribe((data: any) => {
                    for (let i = 0; i < data.length; i++) {
                        this.buttons[data[i].button] = data[i].condition;
                    }
                });

                this.alertConnection = this.socketService.getAlerts().subscribe((data: any) => {
                    this.alert = data;
                    const alert = Alert.create((<any>AlertType)[data.type], data.message, 5000, false);
                    this.alertService.alert(alert);
                });


                this.initConnection = this.socketService.getInit().subscribe((data: any) => {
                    this.player = data;
                });

                this.socketService.getMessages().subscribe(message => {
                    this.messages.push(message);
                });

                this.socketService.onDisconnect().subscribe((data: any) => {
                    this.disconnected.emit(true);
                });
            });
        });
    }

    onDecreaseBet() {
        if (this.bet > 5) {
            this.bet -= 5;
        }
    }

    onIncreaseBet() {
        if (this.bet < this.player.money) {
            this.bet += 5;
        }
    }

    onClickReady() {
        this.player.money -= this.player.bet;
        this.clearTimer();
        this.socketService.sendAction('readyCheck', this.bet);
    }

    onClickHit() {
        this.clearTimer();
        this.socketService.sendAction('hit');
    }

    onClickStay() {
        this.clearTimer();
        this.socketService.sendAction('stay');
    }

    onClickDouble() {
        this.clearTimer();
        this.socketService.sendAction('double');
    }

    onClickSplit() {
        this.clearTimer();
        this.socketService.sendAction('split');
    }

    onClickBuyIn() {
        this.socketService.sendAction('buyIn');
    }

    clearTimer() {
        clearInterval(this.timer);
        this.time = null;
        this.timer = null;
    }

    sendMessage(message: string) {
        this.message = message;
        this.socketService.sendMessage(message);
    }

    isPlaying = (data) => {
        for (let i = 0; i < data.players.length; i++) {
            const player = data.players[i];
            if (player) {
                if (player.id == this.session.user.id) {
                    return true;
                }
            }
        }
    };
}
