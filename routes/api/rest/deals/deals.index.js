import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()
import { isBefore } from 'date-fns'

// models
import Deal from '../../../../models/Deal.js'

// constants
import { RESTAURANT_ROLES } from '../../../../constants/restaurant.js'

// middlewares
import auth from '../../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../../middleware/rest-role-guard.middleware.js'
import validate from '../../../../middleware/validation.middleware.js'

// validations
import { addDealSchema, editDealSchema } from '../../../../validation/deals.validation.js'

// utils
import { SendError, capitalizeSentence, getID, throwErr } from '../../../utilities/utilities.js'

import mongoose from 'mongoose'
import { DEALS_PER_LOCATION } from '../../../../constants/deals.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/active', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    query: { current_date },
  } = req
  try {
    let currentDate = current_date ? new Date(current_date) : new Date()

    const query = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
          $or: [{ is_expired: false }, { end_date: { $gt: currentDate } }],
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views.users'] },
            },
          },
          id: '$_id',
          days_left: {
            $dateDiff: {
              startDate: currentDate,
              endDate: '$end_date',
              unit: 'day',
            },
          },
          days_active: {
            $dateDiff: {
              startDate: '$start_date',
              endDate: currentDate,
              unit: 'day',
            },
          },
        },
      },
      {
        $unset: [
          'views.users',
          'saves.users',
          'locations',
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'description',
        ],
      },
    ]).sort({ updatedAt: -1 })

    res.json(query)
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/expired', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    query: { current_date },
  } = req
  try {
    let currentDate = current_date ? new Date(current_date) : new Date()
    const agg = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
          $or: [{ is_expired: true }, { end_date: { $lte: currentDate } }],
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views.users'] },
            },
          },
          id: '$_id',
          days_active: {
            $dateDiff: {
              startDate: '$start_date',
              endDate: '$end_date',
              unit: 'day',
            },
          },
        },
      },
      {
        $unset: [
          'views.users',
          'saves.users',
          'locations',
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'description',
        ],
      },
    ]).sort({ updatedAt: -1 })

    res.json(agg)
  } catch (error) {
    SendError(res, error)
  }
})

router.get(
  '/single/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      params: { id },
      restaurant,
      query: { current_date },
    } = req

    let currentDate = current_date ? new Date(current_date) : new Date()

    try {
      const deal = await Deal.aggregate([
        {
          $match: {
            'restaurant.id': restaurant._id,
            _id: mongoose.Types.ObjectId(id),
          },
        },
        {
          $addFields: {
            days_active: {
              $dateDiff: {
                startDate: '$start_date',
                endDate: currentDate,
                unit: 'day',
              },
            },
          },
        },
        {
          $addFields: {
            unique_views: {
              count: {
                $sum: {
                  $size: { $setUnion: [[], '$views.users'] },
                },
              },
              avg: {
                $cond: {
                  if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['views.count', 1] }] },
                  then: {
                    $divide: [
                      {
                        $sum: {
                          $size: { $setUnion: [[], '$views.users'] },
                        },
                      },
                      '$days_active',
                    ],
                  },
                  else: {
                    $sum: {
                      $size: { $setUnion: [[], '$views.users'] },
                    },
                  },
                },
              },
            },
            'views.avg': {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['views.count', 1] }] },
                then: {
                  $divide: ['$views.count', '$days_active'],
                },
                else: '$views.count',
              },
            },
            'saves.avg': {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['saves.count', 1] }] },
                then: {
                  $divide: ['$saves.count', '$days_active'],
                },
                else: '$saves.count',
              },
            },
          },
        },
        {
          $unset: ['views.users', 'saves.users', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt'],
        },
      ])

      if (!deal?.length) {
        throwErr('Deal not found', 402)
        return
      } else res.json(deal[0])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.get(
  '/use-template/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      params: { id },
      restaurant,
    } = req

    try {
      const deal = await Deal.aggregate([
        {
          $match: {
            'restaurant.id': restaurant._id,
            _id: mongoose.Types.ObjectId(id),
          },
        },
        {
          $unset: [
            'views',
            'saves',
            'restaurant',
            'cuisines',
            'dietary_requirements',
            'createdAt',
            'updatedAt',
            'is_expired',
            'start_date',
            'end_date',
            'locations',
          ],
        },
      ])

      if (!deal?.length) {
        throwErr('Deal not found', 402)
        return
      } else res.json(deal[0])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post(
  '/add',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(addDealSchema),
  async (req, res) => {
    const {
      restaurant,
      body: { start_date, end_date, name, description, locations },
      query: { current_date },
    } = req

    let currentDate = current_date ? new Date(current_date) : new Date()

    try {
      const activeDealsCount = await Deal.count({
        'restaurant.id': restaurant._id,
        $or: [{ is_expired: false }, { end_date: { $gt: currentDate } }],
      })

      const locationsCount = restaurant?.locations?.length || 0

      if (activeDealsCount >= locationsCount * DEALS_PER_LOCATION) {
        throwErr('Maxmimum active deals limit reached', 402)
      }

      const locationsMap = locations
        .map((id) => {
          const mappedLoc = restaurant.locations.find((rL) => getID(rL) === id)
          return mappedLoc ? { location_id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
        })
        .filter(Boolean)

      if (!locationsMap?.length) throwErr('Error: No matching locations found', 400)

      const deal = new Deal({
        start_date,
        end_date,
        name: capitalizeSentence(name),
        description,
        locations: locationsMap,
        restaurant: { id: restaurant._id, name: restaurant.name },
        dietary_requirements: restaurant.dietary_requirements,
        cuisines: restaurant.cuisines,
        is_expired: false,
      })
      await deal.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(editDealSchema),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { name, description, end_date, locations },
    } = req

    const locationsMap = locations
      .map((id) => {
        const mappedLoc = restaurant.locations.find((rL) => getID(rL) === id)
        return mappedLoc ? { location_id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
      })
      .filter(Boolean)

    if (!locationsMap?.length) throwErr('Error: No matching locations found', 400)

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to edit this deal', 400)
      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        throwErr('Deal end date cannot be before the start date', 400)
      }
      deal.name = name
      deal.description = description
      deal.end_date = end_date
      deal.locations = locationsMap
      await deal.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)
router.post(
  '/delete/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
    } = req

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to delete this deal', 400)
      await deal.delete()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/expire/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { end_date },
    } = req

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to expire this deal', 400)
      if (deal.is_expired) throwErr('Deal is already expired', 400)
      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        throwErr('Deal end date cannot be before the start date', 400)
      }
      deal.is_expired = true
      deal.end_date = end_date
      await deal.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router