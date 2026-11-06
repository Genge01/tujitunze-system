import { Module } from '@nestjs/common';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// No TypeOrmModule.forFeature(...) — SearchService queries via the
// injected DataSource directly (raw parameterized SQL spanning several
// tables/joins per role), the same pattern AdminService and
// SuperAdminSavingRulesService already use, rather than repository
// injection for entities it only ever reads a few columns from.
import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [AuthorizationModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
