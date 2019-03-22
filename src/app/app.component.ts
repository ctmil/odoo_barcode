import { Component, ViewChild, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { trigger, state, style, animate, transition, keyframes } from '@angular/animations';
import { timer } from 'rxjs';
declare var jquery: any;
declare var $: any;
declare var navigator: any;
declare var window: any;
declare var cordova: any;

export interface Product {
  value: number;
  viewValue: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('logged', [
      state('inactive', style({
        left: '50%'
      })),
      state('active',   style({
        left: '-100%'
      })),
      transition('inactive => active', [
        animate(500, keyframes([
          style({left: '50%', offset: 0}),
          style({left: '55%', offset: 0.2}),
          style({left: '55%', offset: 0.4}),
          style({left: '-100%', offset: 1.0})
        ]))
      ]),
      transition('active => inactive', animate('500ms ease-in-out'))
    ])
  ]
})

export class AppComponent implements OnInit {
  public title = 'barcode';
  ////////////////////////////
  @ViewChild('form') form: ElementRef;
  public server = '';
  public db = '';
  public user = '';
  public pass = '';
  public uid = 0;
  ////////////////////////////
  public logState = 'inactive';
  ////////////////////////////
  public showData = false;
  public inLoad = true;
  ////////////////////////////
  public barcode = '';
  public barcode_format = '';
  ////////////////////////////
  products: Product[] = [];

  constructor(private renderer: Renderer2) {}

  public ngOnInit(): void {
    this.renderer.listen('document', 'deviceready', () => {
      console.log('Device is Ready');
    });
  }

  public startScann(): void {
    const this_ = this;
    this.barcode = '';
    this.barcode_format = '';

    cordova.plugins.barcodeScanner.scan(
      function (result: any) {
        this_.barcode = result.text;
        this_.barcode_format = result.format;
        console.log('We got a barcode\n' +
                    'Result: ' + result.text + '\n' +
                    'Format: ' + result.format + '\n' +
                    'Cancelled: ' + result.cancelled);
      },
      function (error: any) {
        console.log('Scanning failed: ' + error);
      },
      {
        preferFrontCamera : false, // iOS and Android
        showFlipCameraButton : false, // iOS and Android
        showTorchButton : true, // iOS and Android
        torchOn: false, // Android, launch with the torch switched on (if available)
        prompt : 'Place a barcode inside the scan area', // Android
        resultDisplayDuration: 0, // Time of show
        orientation : 'portrait', // Android only (portrait|landscape), default unset so it rotates with the device
        disableAnimations : true, // iOS
        disableSuccessBeep: false // iOS and Android
      }
   );
  }

  public logIn(e: any): void {
    e.preventDefault();
    console.log('Data Readed');
    console.log('Server: ', this.form.nativeElement.elements['server'].value);
    console.log('DB: ', this.form.nativeElement.elements['db'].value);
    console.log('User: ', this.form.nativeElement.elements['user'].value);
    console.log('Pass: ', this.form.nativeElement.elements['pass'].value);

    this.server = this.form.nativeElement.elements['server'].value;
    this.db = this.form.nativeElement.elements['db'].value;
    this.user = this.form.nativeElement.elements['user'].value;
    this.pass = this.form.nativeElement.elements['pass'].value;

    ////////////////////////////////////////////////////////////////////////

    this.odooConnect(this.server, this.db, this.user, this.pass);

    const this_ = this;

    this.logState = 'active';

    const secondsCounter = timer(300);

    secondsCounter.subscribe( () => {
      this_.showData = true;
    });
  }

  public odooConnect(server: string, db: string, user: string, pass: string): void {
    const this_ = this;
    const forcedUserValue = $.xmlrpc.force('string', user);
    const forcedPasswordValue = $.xmlrpc.force('string', pass);
    const forcedDbNameValue = $.xmlrpc.force('string', db);
    const server_url = server + '/xmlrpc';

    $.xmlrpc({
      url: server_url + '/common',
      methodName: 'login',
      dataType: 'xmlrpc',
      crossDomain: true,
      params: [forcedDbNameValue, forcedUserValue, forcedPasswordValue],
      success: function(response: any, status: any, jqXHR: any) {
        console.log(response + ' - ' + status);
        if (response[0] !== false) {
          this_.getProducts(this_.server + '/xmlrpc', this_.db, this_.user, this_.pass, response[0]);
          this_.uid = response[0];
        } else {
          this_.logOut();
        }
      },
      error: function(jqXHR: any, status: any, error: any) {
        console.log('Err: ' + jqXHR + ' - ' + status + '-' + error);
        this_.logOut();
      }
    });
  }

  public getProducts(server_url: string, db: string, user: string, pass: string, uid: number): void {
    const this_ = this;
    const inParams = [];

    $.xmlrpc({
      url: server_url + '/2/object',
      methodName: 'execute_kw',
      crossDomain: true,
      params: [db, uid, pass, 'product.template', 'search_read', inParams],
      success: function(response: any, status: any, jqXHR: any) {
        console.log(response);
        for (let i = 0; i < response[0].length; i++) {
          this_.products[i] = {value: response[0][i].id, viewValue: response[0][i].name};
        }
        console.log(this_.products);
        this_.inLoad = false;
      },
      error: function(jqXHR: any, status: any, error: any) {
        console.log('Error : ' + error );
      }
    });
  }

  public logOut(): void {
    this.form.nativeElement.reset();
    this.showData = false;
    this.inLoad = true;
    this.logState = 'inactive';
  }
}
