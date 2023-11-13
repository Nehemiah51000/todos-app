import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model } from 'mongoose'

import { CreateIconDto } from './dto/create-icon.dto'
import { UpdateIconDto } from './dto/update-icon.dto'
import { ToggleIconsStatusDto } from './dto/toggle-icons-status.dto'
import { Icon } from './schema/icon.schema'
import { FactoryUtils } from 'src/common/services/factory-utils'

@Injectable()
export class IconsService {
  private readonly logger: LoggerService = new Logger(IconsService.name)

  constructor(
    @InjectModel(Icon.name)
    private readonly iconModel: Model<Icon>,

    private readonly factoryUtils: FactoryUtils,
  ) {}

  async create(createIconDto: CreateIconDto) {
    this.logger.log(`Adding new icon`)
    try {
      // 1). slugify name
      const slug = this.factoryUtils.slugify(createIconDto.prettyName, 'icon')

      // 2). save the icon
      const createdIcon = await this.iconModel.create({
        ...createIconDto,
        slug,
      })

      return {
        message: `Icon ${createdIcon.prettyName} was successfully created`,
        data: createdIcon,
      }
    } catch (error) {
      this.logger.warn(`Error while adding a new icon`)
      this.logger.error(error)

      if (error.code === 11000) {
        const message = this.factoryUtils.autoGenerateDuplicateMessage(error)
        throw new ConflictException(message)
      }

      throw new InternalServerErrorException(
        `Something unexpected happened while creating a new icon`,
      )
    }
  }

  async findAll(filters: FilterQuery<Icon> = {}) {
    const allIcons = await this.iconModel.find(filters).sort('prettyName')

    return {
      data: allIcons,
    }
  }

  async findOne(iconId: string) {
    const foundIcon = await this.iconModel.findById(iconId)

    if (!foundIcon) {
      this.logger.warn(`User is trying to access icon not in the database`)

      throw new NotFoundException(`Icon with id ${iconId} not found`)
    }

    return foundIcon
  }

  async update(
    iconId: string,
    updateIconDto: Partial<UpdateIconDto & ToggleIconsStatusDto>,
  ) {
    const updatedIcon = await this.iconModel.findByIdAndUpdate(
      iconId,
      updateIconDto,
      {
        new: true,
      },
    )

    if (!updateIconDto) {
      this.logger.warn(`Error while updating icon with ${iconId}`)

      throw new BadRequestException(`Updating icon with id ${iconId} failed`)
    }

    const message = `Icon with ${iconId} was successfully updated`
    this.logger.log(message)

    return {
      message,
      data: updatedIcon,
    }
  }

  toggleStatus(iconId: string, toggleStatusDto: ToggleIconsStatusDto) {
    return this.update(iconId, toggleStatusDto)
  }

  async remove(iconId: string) {
    const deletedIcon = await this.iconModel.findByIdAndDelete(iconId)

    if (!deletedIcon) {
      this.logger.warn(`Error while deleting icon with ${iconId}`)

      throw new BadRequestException(`Deleting icon with id ${iconId} failed`)
    }

    const message = `Icon with ${iconId} was successfully deleted`
    this.logger.log(message)

    return {
      message,
      data: deletedIcon,
    }
  }
}
