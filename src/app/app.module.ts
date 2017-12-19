import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {TreeTableModule,SharedModule} from 'primeng/primeng';

import { AppComponent } from './app.component';
import { TreeTableComponent } from './tree-table/tree-table.component';


@NgModule({
  declarations: [
    AppComponent,
    TreeTableComponent
  ],
  imports: [
    BrowserModule,
    TreeTableModule,
    SharedModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
