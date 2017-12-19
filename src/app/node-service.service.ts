import { Injectable } from '@angular/core';
import {TreeNode} from 'primeng/primeng';
import { Http, Response } from '@angular/http';


@Injectable()
export class NodeServiceService {

  constructor(private http: Http) { }

  getFilesystem() {
    return this.http.get('./assets/json/treeData.json').toPromise()
                .then(res => <TreeNode[]> res.json().data);
  }

}
