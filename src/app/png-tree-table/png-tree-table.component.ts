import { Component, OnInit } from '@angular/core';
import {TreeTableModule} from 'primeng/primeng';
import { FormsModule } from '@angular/forms';

import { NodeServiceService } from '../node-service.service';
import { TreeTable, TreeNode } from 'primeng/primeng';
import * as launchpadAPI from 'launchpad-api/src/launchpadAPI';

declare var launchpadAPI : any;;
@Component({
  selector: 'app-png-tree-table',
  templateUrl: './png-tree-table.component.html',
  styleUrls: ['./png-tree-table.component.less']
})

export class PngTreeTableComponent implements OnInit {
  files: TreeNode[] = [];
  inLaunchpad: Boolean = false;
  constructor(private nodeService: NodeServiceService, private inLaunchpad: Boolean) {

  }

  ngOnInit() {
    console.log(launchpadAPI, 'this.launchpadAPI>>>>');
    this.inLaunchpad = launchpadAPI.inLaunchpad();
    console.log(this.inLaunchpad, 'in launchpad>>>>');
    this.nodeService.getFilesystem().then(data => this.files = data);
  }

}
