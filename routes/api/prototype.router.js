import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

// import Restaurant from '../../models/Restaurant.js'
// import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../constants/restaurant.js'

// import auth from '../../middleware/auth.middleware.js'
// import validate from '../../middleware/validation.middleware.js'
// import restRoleGuard from '../../middleware/rest-role-guard.middleware.js'÷
import { SendError, capitalizeFirstLetter } from '../utilities/utilities.js'
import { feUrl } from '../../base/base.js'
import { confirm_email_content } from '../../constants/email.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.get('/', async (req, res) => {
  try {
    return res.render('emails/action-email', {
      content: confirm_email_content.description,
      title: confirm_email_content.title,
      list: ['helo', 'helllo'],
      action_primary: { text: 'Accept', url: feUrl },
      action_secondary: { text: 'Decline', url: feUrl },
      receiver: capitalizeFirstLetter('kez'),
    })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
