import { Routes } from '@angular/router';
import { Create } from './pages/create/create';
import { Join } from './pages/join/join';

export const routes: Routes = [
    {
        path: '',
        component: Create
    },
    {
        path: 'join',
        component: Join
    },
    {
        path: '**',
        component: Create
    }
];
