import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {TreeTableModule, SharedModule} from 'primeng/primeng';
import { HttpModule, JsonpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { PngTreeTableComponent } from './png-tree-table/png-tree-table.component';
import { NodeServiceService } from './node-service.service';

@NgModule({
  declarations: [
    AppComponent,
    PngTreeTableComponent
  ],
  imports: [
    BrowserModule,
    TreeTableModule,
    SharedModule,
    HttpModule,
    JsonpModule,
    FormsModule
  ],
  providers: [NodeServiceService],
  bootstrap: [AppComponent]
})
export class AppModule { }
